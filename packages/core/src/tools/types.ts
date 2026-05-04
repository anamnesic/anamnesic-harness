export interface ToolDefinition {
  name: string
  description: string
  parameters: ToolParameters
  permissions: PermissionRequirement
  category: ToolCategory
  streaming?: boolean
  timeout?: number
}

export interface ToolParameters {
  type: "object"
  properties: Record<string, ToolProperty>
  required?: string[]
}

export interface ToolProperty {
  type: string
  description: string
  enum?: string[]
  default?: unknown
}

export type ToolCategory =
  | "file"
  | "system"
  | "network"
  | "git"
  | "browser"
  | "custom"

export type PermissionRequirement =
  | "none"
  | "read"
  | "write"
  | "execute"
  | "admin"

export interface ToolExecutionContext {
  sessionId: string
  agentId: string
  workingDirectory: string
  environment: Record<string, string>
  signal?: AbortSignal
}

export interface ToolResult {
  success: boolean
  output?: unknown
  error?: string
  metadata?: Record<string, unknown>
  stream?: AsyncIterable<string>
}

export interface ToolRegistryEntry extends ToolDefinition {
  handler: ToolHandler
}

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolExecutionContext,
) => Promise<ToolResult> | AsyncIterable<string>

export interface PermissionCheck {
  granted: boolean
  reason?: string
  requiresUserApproval?: boolean
}

export interface PermissionManager {
  check(
    tool: ToolDefinition,
    context: ToolExecutionContext,
  ): Promise<PermissionCheck>
  grant(toolName: string, sessionId: string): void
  revoke(toolName: string, sessionId: string): void
  setMode(mode: PermissionMode): void
}

export type PermissionMode =
  | "interactive"
  | "owner-only"
  | "always-allow"
  | "yolo"
