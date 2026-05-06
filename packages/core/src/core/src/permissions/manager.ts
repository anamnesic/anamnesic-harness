import type {
  PermissionManager,
  PermissionMode,
  PermissionRequest,
  PermissionResponse,
  GranularPermission,
  PermissionStore,
} from "./types"
import { randomUUID } from "crypto"

export class CorePermissionManager implements PermissionManager {
  private mode: PermissionMode = "interactive"
  private store: PermissionStore
  private pendingRequests: Map<string, PermissionRequest> = new Map()
  private listeners: Set<(request: PermissionRequest) => void> = new Set()

  constructor(store?: PermissionStore) {
    this.store = store ?? new MemoryPermissionStore()
  }

  setMode(mode: PermissionMode): void {
    this.mode = mode
  }

  getMode(): PermissionMode {
    return this.mode
  }

  async requestPermission(
    request: PermissionRequest,
  ): Promise<PermissionResponse> {
    const existing = await this.store.find(request)
    if (existing) {
      return {
        requestId: request.id,
        granted: existing.granted,
        reason: "From stored permission",
      }
    }

    if (this.mode === "yolo") {
      return { requestId: request.id, granted: true }
    }

    if (this.mode === "always-allow") {
      return { requestId: request.id, granted: true }
    }

    if (this.mode === "owner-only" && !this.isOwner(request.userId)) {
      return {
        requestId: request.id,
        granted: false,
        reason: "Owner-only mode: user is not owner",
      }
    }

    return this.handleInteractiveRequest(request)
  }

  async checkGranular(request: PermissionRequest): Promise<boolean> {
    const permission = await this.store.find(request)
    return permission?.granted ?? false
  }

  grantTool(
    toolName: string,
    sessionId?: string,
    expiresAt?: number,
  ): void {
    this.store.save({
      toolName,
      sessionId,
      granted: true,
      expiresAt,
    })
  }

  revokeTool(toolName: string, sessionId?: string): void {
    this.store.revoke(toolName, sessionId)
  }

  onPermissionRequest(handler: (request: PermissionRequest) => void): void {
    this.listeners.add(handler)
  }

  private async handleInteractiveRequest(
    request: PermissionRequest,
  ): Promise<PermissionResponse> {
    this.pendingRequests.set(request.id, request)

    this.listeners.forEach((listener) => {
      try {
        listener(request)
      } catch {
        // Listener error
      }
    })

    return {
      requestId: request.id,
      granted: false,
      reason: "Awaiting user approval",
    }
  }

  private isOwner(userId: string): boolean {
    return userId === "owner"
  }

  resolveRequest(response: PermissionResponse): void {
    const request = this.pendingRequests.get(response.requestId)
    if (!request) return

    if (response.remember) {
      this.store.save({
        toolName: request.toolName,
        sessionId: request.sessionId,
        granted: response.granted,
      })
    }

    this.pendingRequests.delete(response.requestId)
  }
}

class MemoryPermissionStore implements PermissionStore {
  private permissions: GranularPermission[] = []

  async save(permission: GranularPermission): Promise<void> {
    this.permissions.push(permission)
  }

  async find(
    request: PermissionRequest,
  ): Promise<GranularPermission | undefined> {
    return this.permissions.find(
      (p) =>
        p.toolName === request.toolName &&
        (!p.sessionId || p.sessionId === request.sessionId) &&
        (!p.expiresAt || p.expiresAt > Date.now()),
    )
  }

  async revoke(toolName: string, sessionId?: string): Promise<void> {
    this.permissions = this.permissions.filter(
      (p) => p.toolName !== toolName || (sessionId && p.sessionId !== sessionId),
    )
  }

  async clear(): Promise<void> {
    this.permissions = []
  }
}
