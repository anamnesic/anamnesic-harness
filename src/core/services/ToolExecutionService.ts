import type { AgentTool, ToolContext, ToolResult, Role, StreamingToolResult } from '../tools/types';
import { getToolRegistry, IToolRegistry } from '../tools/registry';
import { hasPermission, requirePermission } from '../policies/permissions';
import { validateCommand, type CommandValidationResult } from '../policies/guardrails';
import { ApprovalRequest, ApprovalStatus } from '../policies/approvalFlow';

export interface ToolExecutionOptions {
  role?: Role;
  dryRun?: boolean;
  timeoutMs?: number;
  onChunk?: (content: string) => void;
}

export interface ToolExecutionResult extends ToolResult {
  toolName: string;
  riskLevel?: string;
  permissionChecks: string[];
  approvalRequired?: boolean;
  approvalId?: string;
}

export class ToolExecutionService {
  private registry: IToolRegistry;

  constructor(registry?: IToolRegistry) {
    this.registry = registry ?? getToolRegistry();
  }

  async executeTool(
    toolName: string,
    ctx: ToolContext,
    input: unknown,
    options: ToolExecutionOptions = {}
  ): Promise<ToolExecutionResult> {
    const tool = this.registry.get(toolName);
    if (!tool) {
      return {
        toolName,
        success: false,
        output: '',
        error: `Tool not found: ${toolName}`,
        permissionChecks: [],
      };
    }

    const role = options.role ?? 'agent';
    const permissionChecks: string[] = [];

    // Check permissions
    if (tool.permissions) {
      for (const perm of tool.permissions) {
        const hasPerm = hasPermission(role, perm);
        permissionChecks.push(`${perm}: ${hasPerm ? 'granted' : 'denied'}`);
        if (!hasPerm) {
          return {
            toolName,
            success: false,
            output: '',
            error: `Permission denied: ${perm}`,
            permissionChecks,
          };
        }
      }
    }

    // Check risk level
    let riskLevel = tool.riskLevel;
    if (toolName === 'runCommand' && typeof input === 'object' && input !== null) {
      const cmdInput = input as { command?: string };
      if (cmdInput.command) {
        const validation: CommandValidationResult = validateCommand(cmdInput.command);
        riskLevel = validation.riskLevel;
        
        if (validation.riskLevel === 'blocked') {
          return {
            toolName,
            success: false,
            output: '',
            error: `Command blocked: ${validation.reason}`,
            permissionChecks,
            riskLevel: validation.riskLevel,
          };
        }

        if (validation.requiresConfirmation && role !== 'admin') {
          return {
            toolName,
            success: false,
            output: '',
            error: 'Approval required for destructive command',
            permissionChecks,
            riskLevel: validation.riskLevel,
            approvalRequired: true,
          };
        }
      }
    }

    // Execute tool
    try {
      const result = await tool.execute(ctx, input);
      return {
        toolName,
        success: result.success,
        output: result.output,
        error: result.error,
        filesAffected: result.filesAffected,
        permissionChecks,
        riskLevel,
      };
    } catch (error) {
      return {
        toolName,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        permissionChecks,
        riskLevel,
      };
    }
  }

  async executeStreaming(
    toolName: string,
    ctx: ToolContext,
    input: unknown,
    options: ToolExecutionOptions = {}
  ): Promise<StreamingToolResult | ToolExecutionResult> {
    const tool = this.registry.get(toolName);
    if (!tool) {
      return {
        toolName,
        success: false,
        output: '',
        error: `Tool not found: ${toolName}`,
        permissionChecks: [],
      };
    }

    // Check if tool supports streaming
    if (!tool.executeStreaming) {
      // Fall back to regular execution
      const result = await this.executeTool(toolName, ctx, input, options);
      return {
        stream: (async function* () {
          yield { type: 'chunk' as const, content: result.output };
          yield { type: 'end' as const, result };
        })(),
      };
    }

    return {
      stream: tool.executeStreaming(ctx, input),
    };
  }

  listAvailableTools(role: Role): Array<{ tool: AgentTool; canExecute: boolean }> {
    const tools = this.registry.list();
    return tools.map(tool => ({
      tool,
      canExecute: this.registry.canExecute(tool, role),
    }));
  }
}
