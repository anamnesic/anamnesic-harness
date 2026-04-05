import * as vscode from 'vscode';
import { DryRunManager, PlannedAction, DryRunSummary } from './DryRunManager';
import { DiffPreviewHandler } from './DiffPreviewHandler';
import { CommandConfirmationHandler } from './CommandConfirmationHandler';
import { RollbackCommandHandler } from './RollbackCommandHandler';
import { SnapshotService } from '@thinkcoffee/core/src/services/SnapshotService';
import { ActionLogService } from '@thinkcoffee/core/src/services/ActionLogService';
import { validateCommand, CommandValidationResult } from '@thinkcoffee/core/src/guardrails/command-validator';
import type { ChatService, PipelineService } from '@thinkcoffee/core';
import type { ActionLogEntry, FileAffected, CommandRiskLevel, UserDecision } from '@thinkcoffee/core/src/types/safety-net';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SafetyNetIntegration - Integra todos os componentes de seguranca com o AgentService.
 *
 * Responsabilidades:
 * - Interceptar tool calls de escrita para snapshot e diff preview
 * - Gerenciar modo dry-run
 * - Validar e confirmar comandos shell
 * - Logar todas as acoes
 * - Coordenar rollback
 *
 * REQ-01 a REQ-06 do PM-BACKLOG-V3.
 */
export class SafetyNetIntegration {
  private readonly _dryRunManager: DryRunManager;
  private readonly _rollbackHandler: RollbackCommandHandler;
  private readonly _snapshotService: SnapshotService;
  private readonly _actionLogService: ActionLogService;
  private readonly _workspaceRoot: string;

  private _currentPipelineId: string | undefined;
  private _currentPhaseIndex: number = 0;
  private _currentPhaseName: string = '';

  constructor(workspaceRoot: string) {
    this._workspaceRoot = workspaceRoot;
    this._dryRunManager = new DryRunManager();
    this._rollbackHandler = new RollbackCommandHandler(workspaceRoot);
    this._snapshotService = new SnapshotService(workspaceRoot);
    this._actionLogService = new ActionLogService(workspaceRoot);
  }

  // ─── Getters ─────────────────────────────────────────────────

  get isDryRunEnabled(): boolean {
    return this._dryRunManager.isDryRunEnabled;
  }

  get dryRunManager(): DryRunManager {
    return this._dryRunManager;
  }

  get rollbackHandler(): RollbackCommandHandler {
    return this._rollbackHandler;
  }

  // ─── Pipeline Context ────────────────────────────────────────

  /**
   * Define o contexto do pipeline atual para logging e snapshots.
   */
  setPipelineContext(pipelineId: string, phaseIndex: number, phaseName: string): void {
    this._currentPipelineId = pipelineId;
    this._currentPhaseIndex = phaseIndex;
    this._currentPhaseName = phaseName;
  }

  /**
   * Limpa o contexto do pipeline.
   */
  clearPipelineContext(): void {
    this._currentPipelineId = undefined;
    this._currentPhaseIndex = 0;
    this._currentPhaseName = '';
  }

  // ─── Dry-Run ─────────────────────────────────────────────────

  /**
   * Ativa/desativa o modo dry-run.
   */
  setDryRun(enabled: boolean): void {
    this._dryRunManager.isDryRunEnabled = enabled;
  }

  /**
   * Alterna o modo dry-run.
   */
  toggleDryRun(): void {
    this._dryRunManager.toggleDryRun();
  }

  /**
   * Retorna o resumo das acoes planejadas em dry-run.
   */
  getDryRunSummary(): DryRunSummary {
    return this._dryRunManager.getSummary();
  }

  /**
   * Retorna a mensagem de resumo formatada para o chat.
   */
  getDryRunSummaryMessage(): string {
    return this._dryRunManager.getSummaryMessage();
  }

  // ─── Tool Call Interceptors ──────────────────────────────────

  /**
   * Intercepta uma chamada write_file.
   *
   * Fluxo:
   * 1. Se dry-run: registra e retorna simulacao
   * 2. Se arquivo existe: mostra diff preview
   * 3. Se aprovado: cria snapshot e executa
   * 4. Loga a acao
   *
   * @returns Resultado da operacao ou mensagem de simulacao/rejeicao
   */
  async interceptWriteFile(
    relativePath: string,
    content: string,
    agentRole: string,
    taskId: string,
  ): Promise<{ proceed: boolean; message: string }> {
    const startTime = Date.now();
    const absolutePath = path.resolve(this._workspaceRoot, relativePath);

    // Validar path traversal
    if (!absolutePath.startsWith(this._workspaceRoot)) {
      await this._logAction({
        toolName: 'write_file',
        agentRole,
        taskId,
        input: { path: relativePath },
        output: 'Path traversal denied',
        result: 'blocked',
        durationMs: Date.now() - startTime,
        filesAffected: [{ path: relativePath, action: 'write' }],
      });
      return { proceed: false, message: 'Error: Path traversal denied' };
    }

    // Dry-run mode
    if (this._dryRunManager.isDryRunEnabled) {
      const simMessage = this._dryRunManager.simulateWriteFile(relativePath, content.length);
      await this._logAction({
        toolName: 'write_file',
        agentRole,
        taskId,
        input: { path: relativePath, contentSize: content.length },
        output: simMessage,
        result: 'success',
        durationMs: Date.now() - startTime,
        dryRun: true,
        filesAffected: [{ path: relativePath, action: 'write' }],
      });
      return { proceed: false, message: simMessage };
    }

    // Verificar configuracao de diff preview
    const diffConfig = this._getDiffPreviewConfig();
    const fileExists = fs.existsSync(absolutePath);

    if (diffConfig === 'always' || (diffConfig === 'existing-only' && fileExists)) {
      // Mostrar diff preview
      const approved = await DiffPreviewHandler.showDiff(this._workspaceRoot, relativePath, content);

      if (!approved) {
        await this._logAction({
          toolName: 'write_file',
          agentRole,
          taskId,
          input: { path: relativePath, contentSize: content.length },
          output: 'Write rejected by user via diff preview',
          result: 'rejected',
          durationMs: Date.now() - startTime,
          filesAffected: [{ path: relativePath, action: 'write' }],
        });
        return { proceed: false, message: `write_file rejected by user for ${relativePath}` };
      }
    }

    // Criar snapshot antes de modificar
    if (this._currentPipelineId) {
      if (fileExists) {
        await this._snapshotService.createSnapshot(
          this._currentPipelineId,
          this._currentPhaseIndex,
          this._currentPhaseName,
          relativePath,
          'modified'
        );
      } else {
        await this._snapshotService.recordFileCreation(
          this._currentPipelineId,
          this._currentPhaseIndex,
          this._currentPhaseName,
          relativePath
        );
      }
    }

    // Permitir a execucao
    return { proceed: true, message: '' };
  }

  /**
   * Registra o resultado de uma operacao write_file apos execucao.
   */
  async logWriteFileResult(
    relativePath: string,
    agentRole: string,
    taskId: string,
    success: boolean,
    error?: string,
    durationMs?: number
  ): Promise<void> {
    await this._logAction({
      toolName: 'write_file',
      agentRole,
      taskId,
      input: { path: relativePath },
      output: success ? `File written: ${relativePath}` : `Error: ${error}`,
      result: success ? 'success' : 'error',
      durationMs: durationMs || 0,
      filesAffected: [{ path: relativePath, action: success ? 'write' : 'write' }],
    });
  }

  /**
   * Intercepta uma chamada run_command.
   *
   * Fluxo:
   * 1. Valida o comando com command-validator
   * 2. Se bloqueado: rejeita imediatamente
   * 3. Se dry-run: registra e retorna simulacao
   * 4. Se destrutivo: pede confirmacao
   * 5. Loga a acao
   */
  async interceptRunCommand(
    command: string,
    agentRole: string,
    taskId: string,
  ): Promise<{ proceed: boolean; message: string }> {
    const startTime = Date.now();

    // Validar comando
    const validation = validateCommand(command, this._workspaceRoot);

    // Bloqueado - rejeitar imediatamente
    if (validation.riskLevel === 'blocked') {
      await this._logAction({
        toolName: 'run_command',
        agentRole,
        taskId,
        input: { command },
        output: `Command blocked: ${validation.reason}`,
        result: 'blocked',
        durationMs: Date.now() - startTime,
        commandDetails: {
          command,
          validationResult: 'blocked',
          userDecision: 'rejected',
        },
      });
      return { proceed: false, message: `Command blocked: ${validation.reason}` };
    }

    // Dry-run mode
    if (this._dryRunManager.isDryRunEnabled) {
      const simMessage = this._dryRunManager.simulateRunCommand(command);
      await this._logAction({
        toolName: 'run_command',
        agentRole,
        taskId,
        input: { command },
        output: simMessage,
        result: 'success',
        durationMs: Date.now() - startTime,
        dryRun: true,
        commandDetails: {
          command,
          validationResult: validation.riskLevel,
        },
      });
      return { proceed: false, message: simMessage };
    }

    // Verificar configuracao de confirmacao
    const confirmConfig = this._getCommandConfirmationConfig();

    if (
      confirmConfig === 'always' ||
      (confirmConfig === 'destructive-only' && validation.riskLevel === 'destructive')
    ) {
      const approved = await CommandConfirmationHandler.getConfirmation(command, validation.riskLevel);

      if (!approved) {
        await this._logAction({
          toolName: 'run_command',
          agentRole,
          taskId,
          input: { command },
          output: 'Command rejected by user',
          result: 'rejected',
          durationMs: Date.now() - startTime,
          commandDetails: {
            command,
            validationResult: validation.riskLevel,
            userDecision: 'rejected',
          },
        });
        return { proceed: false, message: `Command rejected by user: ${command}` };
      }
    }

    // Permitir a execucao
    return { proceed: true, message: '' };
  }

  /**
   * Registra o resultado de uma operacao run_command apos execucao.
   */
  async logRunCommandResult(
    command: string,
    agentRole: string,
    taskId: string,
    success: boolean,
    exitCode?: number,
    output?: string,
    durationMs?: number
  ): Promise<void> {
    const validation = validateCommand(command, this._workspaceRoot);

    await this._logAction({
      toolName: 'run_command',
      agentRole,
      taskId,
      input: { command },
      output: output?.substring(0, 2000) || (success ? '(no output)' : 'Command failed'),
      result: success ? 'success' : 'error',
      durationMs: durationMs || 0,
      commandDetails: {
        command,
        exitCode,
        validationResult: validation.riskLevel,
        userDecision: 'accepted',
      },
    });
  }

  /**
   * Intercepta uma chamada delete_file.
   */
  async interceptDeleteFile(
    relativePath: string,
    agentRole: string,
    taskId: string,
  ): Promise<{ proceed: boolean; message: string }> {
    const startTime = Date.now();
    const absolutePath = path.resolve(this._workspaceRoot, relativePath);

    // Validar path traversal
    if (!absolutePath.startsWith(this._workspaceRoot)) {
      await this._logAction({
        toolName: 'delete_file',
        agentRole,
        taskId,
        input: { path: relativePath },
        output: 'Path traversal denied',
        result: 'blocked',
        durationMs: Date.now() - startTime,
        filesAffected: [{ path: relativePath, action: 'delete' }],
      });
      return { proceed: false, message: 'Error: Path traversal denied' };
    }

    // Dry-run mode
    if (this._dryRunManager.isDryRunEnabled) {
      const simMessage = this._dryRunManager.simulateDeleteFile(relativePath);
      await this._logAction({
        toolName: 'delete_file',
        agentRole,
        taskId,
        input: { path: relativePath },
        output: simMessage,
        result: 'success',
        durationMs: Date.now() - startTime,
        dryRun: true,
        filesAffected: [{ path: relativePath, action: 'delete' }],
      });
      return { proceed: false, message: simMessage };
    }

    // Criar snapshot antes de deletar
    if (this._currentPipelineId && fs.existsSync(absolutePath)) {
      await this._snapshotService.createSnapshot(
        this._currentPipelineId,
        this._currentPhaseIndex,
        this._currentPhaseName,
        relativePath,
        'deleted'
      );
    }

    return { proceed: true, message: '' };
  }

  /**
   * Loga uma acao de leitura (read_file, list_files, search_code).
   * Essas acoes sempre procedem, apenas logging.
   */
  async logReadAction(
    toolName: 'read_file' | 'list_files' | 'search_code',
    input: Record<string, unknown>,
    agentRole: string,
    taskId: string,
    success: boolean,
    output: string,
    durationMs: number
  ): Promise<void> {
    await this._logAction({
      toolName,
      agentRole,
      taskId,
      input,
      output: output.substring(0, 2000),
      result: success ? 'success' : 'error',
      durationMs,
    });
  }

  // ─── Rollback ────────────────────────────────────────────────

  /**
   * Executa rollback de uma fase.
   */
  async executeRollback(
    pipelineId: string,
    phaseIndex: number,
    chat: ChatService,
    pipelineService?: PipelineService,
    projectId?: string
  ): Promise<boolean> {
    return this._rollbackHandler.executeRollback(
      pipelineId,
      phaseIndex,
      chat,
      pipelineService,
      projectId
    );
  }

  /**
   * Lista snapshots disponiveis.
   */
  async listSnapshots(pipelineId: string, chat: ChatService): Promise<void> {
    return this._rollbackHandler.listSnapshots(pipelineId, chat);
  }

  // ─── Cleanup ─────────────────────────────────────────────────

  /**
   * Executa limpeza de snapshots antigos.
   * Deve ser chamado periodicamente (ex: ao ativar extensao).
   */
  async runCleanup(activePipelineIds: Set<string> = new Set()): Promise<void> {
    try {
      const result = await this._snapshotService.cleanup(activePipelineIds);
      if (result.removedCount > 0) {
        vscode.window.showInformationMessage(
          `Safety Net: Cleanup removeu ${result.removedCount} snapshot(s) antigo(s) (${result.freedSizeMb} MB liberados).`
        );
      }
    } catch (error: any) {
      console.error('[SafetyNetIntegration] Cleanup error:', error.message);
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async _logAction(params: {
    toolName: string;
    agentRole: string;
    taskId: string;
    input: Record<string, unknown>;
    output: string;
    result: 'success' | 'error' | 'rejected' | 'blocked';
    durationMs: number;
    dryRun?: boolean;
    filesAffected?: FileAffected[];
    commandDetails?: {
      command: string;
      exitCode?: number;
      validationResult: CommandRiskLevel;
      userDecision?: UserDecision;
    };
  }): Promise<void> {
    if (!this._currentPipelineId) {
      // Se nao houver pipeline ativo, nao loga
      return;
    }

    try {
      await this._actionLogService.log({
        pipelineId: this._currentPipelineId,
        phaseIndex: this._currentPhaseIndex,
        taskId: params.taskId,
        agentRole: params.agentRole,
        toolName: params.toolName as any,
        input: params.input,
        output: params.output,
        result: params.result,
        durationMs: params.durationMs,
        dryRun: params.dryRun || false,
        filesAffected: params.filesAffected,
        commandDetails: params.commandDetails,
      });
    } catch (error: any) {
      console.error('[SafetyNetIntegration] Failed to log action:', error.message);
    }
  }

  private _getDiffPreviewConfig(): 'always' | 'existing-only' | 'never' {
    const config = vscode.workspace.getConfiguration('thinkcoffee');
    return config.get<'always' | 'existing-only' | 'never'>('diffPreview', 'existing-only');
  }

  private _getCommandConfirmationConfig(): 'always' | 'destructive-only' | 'never' {
    const config = vscode.workspace.getConfiguration('thinkcoffee');
    return config.get<'always' | 'destructive-only' | 'never'>('commandConfirmation', 'destructive-only');
  }
}

// Exportar tipos para uso externo
export { DryRunManager, PlannedAction, DryRunSummary };
