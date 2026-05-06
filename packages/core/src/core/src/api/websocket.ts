import type { SessionManager } from "../sessions"
import type { AgentRuntime } from "../agent"
import { MessageGateway as ChannelGateway } from "../channels"
import type { ToolOrchestrator } from "../tools"
import type { WebSocketMessage } from "./websocket-messages"

export { WebSocketMessage }

export interface TokenPayload {
  token: string
  model: string
  sessionId: string
  done: boolean
}

export interface ToolEventPayload {
  toolName: string
  status: "started" | "completed" | "failed"
  sessionId: string
  result?: unknown
  error?: string
}

export interface SessionUpdatePayload {
  sessionId: string
  messageCount: number
  tokenCount: number
  updatedAt: number
}

export interface PresencePayload {
  userId: string
  status: "online" | "away" | "offline"
  sessionId?: string
}

export class WebSocketAPI {
  private sessions: SessionManager
  private agent: AgentRuntime
  private channels: ChannelGateway
  private tools: ToolOrchestrator
  private clients: Map<WebSocket, { userId: string; sessionId?: string }> = new Map()

  constructor(
    sessions: SessionManager,
    agent: AgentRuntime,
    channels: ChannelGateway,
    tools: ToolOrchestrator,
  ) {
    this.sessions = sessions
    this.agent = agent
    this.channels = channels
    this.tools = tools
  }

  handleConnection(ws: WebSocket, userId: string = "anonymous"): void {
    this.clients.set(ws, { userId })

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string)
        this.handleMessage(ws, message)
      } catch {
        this.sendError(ws, "Invalid message format")
      }
    }

    ws.onclose = () => {
      this.clients.delete(ws)
    }

    this.sendSyncData(ws)
  }

  private async sendSyncData(ws: WebSocket): Promise<void> {
    const sessions = await this.sessions.listSessions()
    this.send(ws, {
      type: "session_sync",
      payload: {
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.title,
          messageCount: s.messageCount,
          updatedAt: s.updatedAt,
        })),
      },
      timestamp: Date.now(),
    })

    const tools = this.tools.getRegistry().list()
    this.send(ws, {
      type: "tool_sync",
      payload: {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          category: t.category,
        })),
      },
      timestamp: Date.now(),
    })
  }

  private async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case "ping":
        this.send(ws, { type: "pong", payload: {}, timestamp: Date.now() })
        break

      case "chat":
        await this.handleChat(ws, message)
        break

      case "switch_session":
        this.handleSwitchSession(ws, message)
        break

      case "presence":
        this.handlePresence(ws, message)
        break

      default:
        this.sendError(ws, `Unknown message type: ${message.type}`)
    }
  }

  private async handleChat(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    const payload = message.payload as any
    const sessionId = payload.sessionId
    const chatMessage = payload.message

    const context = {
      sessionId,
      messages: [{ role: "user" as const, content: chatMessage, timestamp: Date.now() }],
      metadata: {},
      tokenCount: 0,
    }

    try {
      const result = await this.agent.execute(context, { stream: true })

      if (result.success && result.message) {
        const tokens = result.message.content.split("")
        for (const token of tokens) {
          this.send(ws, {
            type: "token",
            payload: { token, done: false },
            timestamp: Date.now(),
            sessionId,
            requestId: message.requestId,
          })
        }

        this.send(ws, {
          type: "token",
          payload: { token: "", done: true },
          timestamp: Date.now(),
          sessionId,
          requestId: message.requestId,
        })
      }
    } catch (err) {
      this.sendError(ws, err instanceof Error ? err.message : "Chat failed")
    }
  }

  private handleSwitchSession(ws: WebSocket, message: WebSocketMessage): void {
    const payload = message.payload as any
    const clientInfo = this.clients.get(ws)
    if (clientInfo) {
      clientInfo.sessionId = payload.sessionId
      this.clients.set(ws, clientInfo)
    }
  }

  private handlePresence(ws: WebSocket, message: WebSocketMessage): void {
    this.broadcast(message as any)
  }

  broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message)
    for (const client of this.clients.keys()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, {
      type: "error",
      payload: { code: "ERROR", message: error, recoverable: false },
      timestamp: Date.now(),
    })
  }
}
