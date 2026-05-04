import type { SessionManager } from "../sessions"
import type { AgentRuntime } from "../agent"
import type { ChannelGateway } from "../channels"
import type { ToolOrchestrator } from "../tools"

export interface WebSocketMessage {
  type: "token" | "tool_event" | "session_update" | "presence" | "error" | "ping" | "pong"
  payload: unknown
  timestamp: number
  sessionId?: string
}

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
  private clients: Set<WebSocket> = new Set()

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

  handleConnection(ws: WebSocket): void {
    this.clients.add(ws)

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
  }

  broadcastToken(payload: TokenPayload): void {
    this.broadcast({
      type: "token",
      payload,
      timestamp: Date.now(),
      sessionId: payload.sessionId,
    })
  }

  broadcastToolEvent(payload: ToolEventPayload): void {
    this.broadcast({
      type: "tool_event",
      payload,
      timestamp: Date.now(),
      sessionId: payload.sessionId,
    })
  }

  broadcastSessionUpdate(payload: SessionUpdatePayload): void {
    this.broadcast({
      type: "session_update",
      payload,
      timestamp: Date.now(),
      sessionId: payload.sessionId,
    })
  }

  broadcastPresence(payload: PresencePayload): void {
    this.broadcast({
      type: "presence",
      payload,
      timestamp: Date.now(),
    })
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    switch (message.type) {
      case "ping":
        this.send(ws, { type: "pong", payload: {}, timestamp: Date.now() })
        break
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`)
    }
  }

  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message)
    for (const client of this.clients) {
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
      payload: { message: error },
      timestamp: Date.now(),
    })
  }
}
