export interface ToolContext {
  workspaceRoot: string;
  pipelineId: string;
  phaseIndex: number;
  phaseName: string;
  taskId: string;
  agentRole: string;
  dryRun: boolean;
  snapshotService?: import('../services/SnapshotService').SnapshotService;
  actionLogService?: import('../services/ActionLogService').ActionLogService;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  filesAffected?: Array<{ path: string; action: 'created' | 'modified' | 'deleted' }>;
}

export interface StreamingToolResult {
  stream: AsyncGenerator<{ type: 'chunk'; content: string } | { type: 'end'; result: ToolResult }>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(ctx: ToolContext, input: unknown): Promise<ToolResult>;
  executeStreaming?(ctx: ToolContext, input: unknown): AsyncGenerator<{ type: 'chunk'; content: string } | { type: 'end'; result: ToolResult }>;
  permissions?: PermissionKey[];
  riskLevel?: 'safe' | 'moderate' | 'destructive' | 'blocked';
}

export type PermissionKey = 
  | 'files:read'
  | 'files:write'
  | 'files:delete'
  | 'commands:run'
  | 'commands:destructive'
  | 'agents:start'
  | 'agents:stop'
  | 'policies:modify'
  | 'data:export';

export type Role = 'admin' | 'developer' | 'viewer' | 'agent';

export interface IToolRegistry {
  register(tool: AgentTool): void;
  unregister(name: string): void;
  get(name: string): AgentTool | undefined;
  list(): AgentTool[];
  getByPermission(permission: PermissionKey): AgentTool[];
  getByRiskLevel(riskLevel: string): AgentTool[];
}
