export type PermissionMode = "interactive" | "owner-only" | "always-allow" | "yolo"

export interface PermissionRequest {
  id: string
  toolName: string
  sessionId: string
  userId: string
  args: Record<string, unknown>
  timestamp: number
  riskLevel: "low" | "medium" | "high"
}

export interface PermissionResponse {
  requestId: string
  granted: boolean
  reason?: string
  remember?: boolean
}

export interface GranularPermission {
  toolName: string
  sessionId?: string
  userId?: string
  pattern?: string
  granted: boolean
  expiresAt?: number
}

export interface PermissionStore {
  save(permission: GranularPermission): Promise<void>
  find(request: PermissionRequest): Promise<GranularPermission | undefined>
  revoke(toolName: string, sessionId?: string): Promise<void>
  clear(): Promise<void>
}

export interface PermissionManager {
  setMode(mode: PermissionMode): void
  getMode(): PermissionMode
  requestPermission(request: PermissionRequest): Promise<PermissionResponse>
  grantTool(toolName: string, sessionId?: string, expiresAt?: number): void
  revokeTool(toolName: string, sessionId?: string): void
  checkGranular(request: PermissionRequest): Promise<boolean>
}
