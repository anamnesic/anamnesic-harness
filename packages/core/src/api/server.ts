import { WebSocketServer } from "ws"
import type { SessionManager } from "../sessions"
import type { AgentRuntime } from "../agent"
import type { ChannelGateway } from "../channels"
import type { ToolOrchestrator } from "../tools"
import { WebSocketAPI } from "./websocket"

export class CoreServer {
  private wss: WebSocketServer
  private api: WebSocketAPI
  private port: number

  constructor(
    port: number,
    sessions: SessionManager,
    agent: AgentRuntime,
    channels: ChannelGateway,
    tools: ToolOrchestrator,
  ) {
    this.port = port
    this.api = new WebSocketAPI(sessions, agent, channels, tools)
    this.wss = new WebSocketServer({ port })
  }

  start(): void {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("Client connected")
      this.api.handleConnection(ws, "user-" + Math.random().toString(36).slice(2, 9))
    })

    console.log(`Core server running on ws://localhost:${this.port}`)
  }

  stop(): void {
    this.wss.close()
  }
}
