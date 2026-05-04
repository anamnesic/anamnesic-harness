// Re-export from the new tools module
export type { AgentTool, ToolContext, ToolResult, StreamingToolResult, PermissionKey, Role, IToolRegistry } from '@/src/core/tools/types';
export { ToolRegistry, getToolRegistry, resetToolRegistry } from '@/src/core/tools/registry';
export type { ToolExecutionOptions, ToolExecutionResult } from '@/src/core/services/ToolExecutionService';
export { ToolExecutionService } from '@/src/core/services/ToolExecutionService';
export { streamTextResponse, executeWithStreaming, streamToReadableStream } from '@/src/core/tools/streaming';
export { mapToolToPermissions, checkToolPermissions, validateToolInput } from '@/src/core/policies/tool-permissions';

// Tool builder for easy tool creation
import type { AgentTool } from '../../tools/types';

export class ToolBuilder {
  private tool: Partial<AgentTool> = {};

  static create(name: string): ToolBuilder {
    const builder = new ToolBuilder();
    builder.tool.name = name;
    return builder;
  }

  description(desc: string): ToolBuilder {
    this.tool.description = desc;
    return this;
  }

  parameters(params: Record<string, unknown>): ToolBuilder {
    this.tool.parameters = params;
    return this;
  }

  execute(fn: (ctx: any, input: unknown) => Promise<any>): ToolBuilder {
    this.tool.execute = fn;
    return this;
  }

  executeStreaming(fn: (ctx: any, input: unknown) => AsyncGenerator<any>): ToolBuilder {
    this.tool.executeStreaming = fn;
    return this;
  }

  permissions(perms: string[]): ToolBuilder {
    this.tool.permissions = perms as any[];
    return this;
  }

  riskLevel(level: 'safe' | 'moderate' | 'destructive' | 'blocked'): ToolBuilder {
    this.tool.riskLevel = level;
    return this;
  }

  build(): AgentTool {
    if (!this.tool.name || !this.tool.description || !this.tool.execute) {
      throw new Error('Tool must have at least name, description, and execute');
    }
    return this.tool as AgentTool;
  }
}
