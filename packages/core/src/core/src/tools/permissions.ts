import type {
  PermissionManager,
  PermissionMode,
  PermissionCheck,
  ToolDefinition,
  ToolExecutionContext,
} from "./types"

export class DefaultPermissionManager implements PermissionManager {
  private mode: PermissionMode = "interactive"
  private grants: Map<string, Set<string>> = new Map()

  async check(
    tool: ToolDefinition,
    context: ToolExecutionContext,
  ): Promise<PermissionCheck> {
    if (this.mode === "yolo") {
      return { granted: true }
    }

    if (this.mode === "always-allow") {
      return { granted: true }
    }

    if (this.mode === "owner-only") {
      return {
        granted: false,
        reason: "Owner-only mode requires explicit owner approval",
        requiresUserApproval: true,
      }
    }

    const sessionGrants = this.grants.get(context.sessionId)
    if (sessionGrants?.has(tool.name)) {
      return { granted: true }
    }

    if (tool.permissions === "none") {
      return { granted: true }
    }

    return {
      granted: false,
      reason: `Tool requires ${tool.permissions} permission`,
      requiresUserApproval: true,
    }
  }

  grant(toolName: string, sessionId: string): void {
    if (!this.grants.has(sessionId)) {
      this.grants.set(sessionId, new Set())
    }
    this.grants.get(sessionId)!.add(toolName)
  }

  revoke(toolName: string, sessionId: string): void {
    const sessionGrants = this.grants.get(sessionId)
    if (sessionGrants) {
      sessionGrants.delete(toolName)
    }
  }

  setMode(mode: PermissionMode): void {
    this.mode = mode
  }

  getMode(): PermissionMode {
    return this.mode
  }
}
