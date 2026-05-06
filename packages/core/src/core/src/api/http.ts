import type { SessionManager } from "../sessions"
import type { AgentRuntime } from "../agent"
import type { ToolOrchestrator } from "../tools"
import type { CorePermissionManager } from "../permissions"

export interface HTTPEndpoint {
  path: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  handler: (req: HTTPRequest) => Promise<HTTPResponse>
}

export interface HTTPRequest {
  body?: unknown
  query?: Record<string, string>
  params?: Record<string, string>
  headers?: Record<string, string>
}

export interface HTTPResponse {
  status: number
  body: unknown
  headers?: Record<string, string>
}

export class HTTPAPI {
  private sessions: SessionManager
  private agent: AgentRuntime
  private tools: ToolOrchestrator
  private permissions: CorePermissionManager
  private endpoints: HTTPEndpoint[] = []

  constructor(
    sessions: SessionManager,
    agent: AgentRuntime,
    tools: ToolOrchestrator,
    permissions: CorePermissionManager,
  ) {
    this.sessions = sessions
    this.agent = agent
    this.tools = tools
    this.permissions = permissions
    this.registerEndpoints()
  }

  private registerEndpoints(): void {
    this.endpoints = [
      {
        path: "/health",
        method: "GET",
        handler: async () => ({
          status: 200,
          body: { status: "ok", timestamp: Date.now() },
        }),
      },
      {
        path: "/rpc",
        method: "POST",
        handler: async (req) => {
          const body = req.body as any
          return {
            status: 200,
            body: { result: `RPC call: ${body?.method ?? "unknown"}` },
          }
        },
      },
      {
        path: "/config",
        method: "GET",
        handler: async () => ({
          status: 200,
          body: this.agent.getConfig(),
        }),
      },
      {
        path: "/sessions",
        method: "GET",
        handler: async () => {
          const sessions = await this.sessions.listSessions()
          return { status: 200, body: sessions }
        },
      },
      {
        path: "/sessions",
        method: "POST",
        handler: async () => {
          const session = await this.sessions.createSession()
          return { status: 201, body: session }
        },
      },
      {
        path: "/webhook",
        method: "POST",
        handler: async (req) => ({
          status: 200,
          body: { received: true, payload: req.body },
        }),
      },
    ]
  }

  async handleRequest(
    path: string,
    method: string,
    req: HTTPRequest,
  ): Promise<HTTPResponse> {
    const endpoint = this.endpoints.find(
      (e) => e.path === path && e.method === method,
    )

    if (!endpoint) {
      return { status: 404, body: { error: "Not found" } }
    }

    try {
      return await endpoint.handler(req)
    } catch (err) {
      return {
        status: 500,
        body: {
          error: err instanceof Error ? err.message : "Internal error",
        },
      }
    }
  }

  getEndpoints(): HTTPEndpoint[] {
    return [...this.endpoints]
  }
}
