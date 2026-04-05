import * as vscode from 'vscode';
import { SnapshotService } from '@thinkcoffee/core/src/services/SnapshotService';
import { ActionLogService } from '@thinkcoffee/core/src/services/ActionLogService';
import { RollbackService } from '@thinkcoffee/core/src/services/RollbackService';
import type { SnapshotMetadata, ActionLogEntry } from '@thinkcoffee/core/src/types/safety-net';

/**
 * WebView Panel para visualizar e gerenciar a Safety Net do ThinkCoffee.
 *
 * Exibe:
 * - Lista de snapshots disponiveis
 * - Log de acoes dos agentes
 * - Controles de rollback
 * - Status de dry-run
 */
export class SafetyNetPanel {
  public static currentPanel: SafetyNetPanel | undefined;
  public static readonly viewType = 'thinkcoffee.safetyNet';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private readonly _snapshotService: SnapshotService;
  private readonly _actionLogService: ActionLogService;
  private readonly _rollbackService: RollbackService;
  private readonly _workspaceRoot: string;

  private _currentPipelineId: string | undefined;

  public static createOrShow(
    extensionUri: vscode.Uri,
    workspaceRoot: string,
    pipelineId?: string
  ): SafetyNetPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SafetyNetPanel.currentPanel) {
      SafetyNetPanel.currentPanel._panel.reveal(column);
      if (pipelineId) {
        SafetyNetPanel.currentPanel.setPipeline(pipelineId);
      }
      return SafetyNetPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      SafetyNetPanel.viewType,
      'Safety Net',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')],
      }
    );

    SafetyNetPanel.currentPanel = new SafetyNetPanel(panel, extensionUri, workspaceRoot, pipelineId);
    return SafetyNetPanel.currentPanel;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    workspaceRoot: string,
    pipelineId?: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._workspaceRoot = workspaceRoot;
    this._currentPipelineId = pipelineId;

    this._snapshotService = new SnapshotService(workspaceRoot);
    this._actionLogService = new ActionLogService(workspaceRoot);
    this._rollbackService = new RollbackService(workspaceRoot);

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'refresh':
            await this._update();
            break;
          case 'rollback':
            await this._handleRollback(message.pipelineId, message.phaseIndex);
            break;
          case 'previewRollback':
            await this._handlePreviewRollback(message.pipelineId, message.phaseIndex);
            break;
          case 'setPipeline':
            this.setPipeline(message.pipelineId);
            break;
          case 'cleanup':
            await this._handleCleanup();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public setPipeline(pipelineId: string): void {
    this._currentPipelineId = pipelineId;
    this._update();
  }

  public dispose(): void {
    SafetyNetPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }

  private async _update(): Promise<void> {
    const webview = this._panel.webview;

    let snapshots: SnapshotMetadata[] = [];
    let actionLog: ActionLogEntry[] = [];
    let summary = {
      totalActions: 0,
      byTool: {} as Record<string, number>,
      byResult: {} as Record<string, number>,
      totalFilesAffected: 0,
      totalDurationMs: 0,
      dryRunCount: 0,
    };

    if (this._currentPipelineId) {
      snapshots = await this._snapshotService.listSnapshots(this._currentPipelineId);
      actionLog = await this._actionLogService.getByPipeline(this._currentPipelineId);
      summary = await this._actionLogService.getSummary(this._currentPipelineId);
    }

    webview.html = this._getHtmlForWebview(webview, snapshots, actionLog, summary);
  }

  private async _handleRollback(pipelineId: string, phaseIndex: number): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      `Tem certeza que deseja fazer rollback da fase ${phaseIndex}? Esta acao nao pode ser desfeita.`,
      { modal: true },
      'Sim, fazer rollback',
      'Cancelar'
    );

    if (confirm !== 'Sim, fazer rollback') {
      return;
    }

    try {
      const result = await this._rollbackService.rollback(pipelineId, phaseIndex);
      vscode.window.showInformationMessage(
        `Rollback concluido: ${result.restored} arquivo(s) restaurado(s), ${result.deleted} arquivo(s) deletado(s).`
      );
      await this._update();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Erro no rollback: ${error.message}`);
    }
  }

  private async _handlePreviewRollback(pipelineId: string, phaseIndex: number): Promise<void> {
    try {
      const preview = await this._rollbackService.previewRollback(pipelineId, phaseIndex);
      const lines = [
        `**Preview do Rollback - Fase ${phaseIndex} (${preview.phaseName})**`,
        `Snapshot de: ${new Date(preview.snapshotTimestamp).toLocaleString()}`,
        '',
      ];

      if (preview.wouldRestore.length > 0) {
        lines.push(`Arquivos que seriam restaurados (${preview.wouldRestore.length}):`);
        preview.wouldRestore.forEach(f => lines.push(`  - ${f}`));
      }

      if (preview.wouldDelete.length > 0) {
        lines.push(`Arquivos que seriam deletados (${preview.wouldDelete.length}):`);
        preview.wouldDelete.forEach(f => lines.push(`  - ${f}`));
      }

      const doc = await vscode.workspace.openTextDocument({
        content: lines.join('\n'),
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc, { preview: true });
    } catch (error: any) {
      vscode.window.showErrorMessage(`Erro ao gerar preview: ${error.message}`);
    }
  }

  private async _handleCleanup(): Promise<void> {
    try {
      const result = await this._snapshotService.cleanup();
      vscode.window.showInformationMessage(
        `Limpeza concluida: ${result.removedCount} snapshot(s) removido(s), ${result.freedSizeMb} MB liberado(s).`
      );
      await this._update();
    } catch (error: any) {
      vscode.window.showErrorMessage(`Erro na limpeza: ${error.message}`);
    }
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    snapshots: SnapshotMetadata[],
    actionLog: ActionLogEntry[],
    summary: {
      totalActions: number;
      byTool: Record<string, number>;
      byResult: Record<string, number>;
      totalFilesAffected: number;
      totalDurationMs: number;
      dryRunCount: number;
    }
  ): string {
    const nonce = getNonce();

    const snapshotsHtml = snapshots.length === 0
      ? '<p class="empty">Nenhum snapshot disponivel para este pipeline.</p>'
      : snapshots.map(s => `
        <div class="snapshot-card">
          <div class="snapshot-header">
            <span class="phase-badge">Fase ${s.phaseIndex}</span>
            <span class="phase-name">${escapeHtml(s.phaseName)}</span>
            <span class="timestamp">${new Date(s.timestamp).toLocaleString()}</span>
          </div>
          <div class="snapshot-files">
            <span class="file-count">${s.files.length} arquivo(s)</span>
            <span class="file-breakdown">
              ${s.files.filter(f => f.action === 'modified').length} modificado(s),
              ${s.files.filter(f => f.action === 'created').length} criado(s),
              ${s.files.filter(f => f.action === 'deleted').length} deletado(s)
            </span>
          </div>
          <div class="snapshot-actions">
            <button class="btn btn-secondary" onclick="previewRollback('${s.pipelineId}', ${s.phaseIndex})">
              Preview
            </button>
            <button class="btn btn-danger" onclick="rollback('${s.pipelineId}', ${s.phaseIndex})">
              Rollback
            </button>
          </div>
        </div>
      `).join('');

    const recentActions = actionLog.slice(-20).reverse();
    const actionsHtml = recentActions.length === 0
      ? '<p class="empty">Nenhuma acao registrada.</p>'
      : `<table class="action-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Agente</th>
              <th>Tool</th>
              <th>Resultado</th>
              <th>Duracao</th>
            </tr>
          </thead>
          <tbody>
            ${recentActions.map(a => `
              <tr class="result-${a.result}${a.dryRun ? ' dry-run' : ''}">
                <td>${new Date(a.timestamp).toLocaleTimeString()}</td>
                <td>${escapeHtml(a.agentRole)}</td>
                <td>${escapeHtml(a.toolName)}${a.dryRun ? ' <span class="dry-run-badge">DRY</span>' : ''}</td>
                <td><span class="result-badge ${a.result}">${a.result}</span></td>
                <td>${a.durationMs}ms</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Safety Net</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --border: var(--vscode-panel-border);
      --accent: var(--vscode-focusBorder);
      --danger: var(--vscode-errorForeground);
      --success: var(--vscode-testing-iconPassed);
      --warning: var(--vscode-editorWarning-foreground);
      --muted: var(--vscode-descriptionForeground);
    }
    
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--fg);
      background: var(--bg);
      padding: 16px;
      margin: 0;
    }
    
    h1 {
      font-size: 1.4em;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    h2 {
      font-size: 1.1em;
      margin: 24px 0 12px 0;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .header-actions {
      margin-left: auto;
      display: flex;
      gap: 8px;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .summary-card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    
    .summary-value {
      font-size: 1.8em;
      font-weight: bold;
      color: var(--accent);
    }
    
    .summary-label {
      font-size: 0.85em;
      color: var(--muted);
      margin-top: 4px;
    }
    
    .snapshot-card {
      background: var(--vscode-editor-inactiveSelectionBackground);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }
    
    .snapshot-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .phase-badge {
      background: var(--accent);
      color: var(--bg);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: bold;
    }
    
    .phase-name {
      font-weight: 500;
    }
    
    .timestamp {
      margin-left: auto;
      color: var(--muted);
      font-size: 0.85em;
    }
    
    .snapshot-files {
      color: var(--muted);
      font-size: 0.9em;
      margin-bottom: 12px;
    }
    
    .file-breakdown {
      margin-left: 8px;
    }
    
    .snapshot-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    
    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
      transition: opacity 0.2s;
    }
    
    .btn:hover {
      opacity: 0.85;
    }
    
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    
    .btn-danger {
      background: var(--danger);
      color: white;
    }
    
    .action-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
    }
    
    .action-table th,
    .action-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    .action-table th {
      color: var(--muted);
      font-weight: 500;
      font-size: 0.85em;
      text-transform: uppercase;
    }
    
    .action-table tr.dry-run {
      opacity: 0.7;
      font-style: italic;
    }
    
    .result-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.8em;
      text-transform: uppercase;
    }
    
    .result-badge.success {
      background: var(--success);
      color: white;
    }
    
    .result-badge.error {
      background: var(--danger);
      color: white;
    }
    
    .result-badge.rejected {
      background: var(--warning);
      color: black;
    }
    
    .result-badge.blocked {
      background: #666;
      color: white;
    }
    
    .dry-run-badge {
      background: var(--warning);
      color: black;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 0.7em;
      margin-left: 4px;
    }
    
    .empty {
      color: var(--muted);
      font-style: italic;
      text-align: center;
      padding: 24px;
    }
    
    .pipeline-selector {
      margin-bottom: 16px;
    }
    
    .pipeline-selector input {
      width: 100%;
      padding: 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>
    Safety Net
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="refresh()">Atualizar</button>
      <button class="btn btn-secondary" onclick="cleanup()">Limpar Antigos</button>
    </div>
  </h1>
  
  ${this._currentPipelineId ? `
    <div class="pipeline-info">
      <strong>Pipeline:</strong> <code>${escapeHtml(this._currentPipelineId.substring(0, 12))}...</code>
    </div>
  ` : `
    <div class="pipeline-selector">
      <input type="text" placeholder="Cole o ID do pipeline aqui..." onchange="setPipeline(this.value)" />
    </div>
  `}
  
  <h2>Resumo</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value">${summary.totalActions}</div>
      <div class="summary-label">Acoes Total</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.totalFilesAffected}</div>
      <div class="summary-label">Arquivos Afetados</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${(summary.totalDurationMs / 1000).toFixed(1)}s</div>
      <div class="summary-label">Tempo Total</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.dryRunCount}</div>
      <div class="summary-label">Dry-Run</div>
    </div>
  </div>
  
  <h2>Snapshots (${snapshots.length})</h2>
  ${snapshotsHtml}
  
  <h2>Acoes Recentes (${recentActions.length})</h2>
  ${actionsHtml}
  
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    
    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }
    
    function rollback(pipelineId, phaseIndex) {
      vscode.postMessage({ command: 'rollback', pipelineId, phaseIndex });
    }
    
    function previewRollback(pipelineId, phaseIndex) {
      vscode.postMessage({ command: 'previewRollback', pipelineId, phaseIndex });
    }
    
    function setPipeline(pipelineId) {
      if (pipelineId && pipelineId.trim()) {
        vscode.postMessage({ command: 'setPipeline', pipelineId: pipelineId.trim() });
      }
    }
    
    function cleanup() {
      vscode.postMessage({ command: 'cleanup' });
    }
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
