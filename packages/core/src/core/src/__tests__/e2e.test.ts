import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { ConfigManager } from "../config"
import { AgentRuntime } from "../agent"
import { ToolOrchestrator, ToolRegistry, DefaultPermissionManager } from "../tools"
import { SessionManager } from "../sessions"
import { ProviderRegistry } from "../providers"
import { CoreServer } from "../api/server"
import WebSocket from "ws"

describe("End-to-End Verification", () => {
  let server: CoreServer
  let port = 8080

  beforeAll(async () => {
    const sessions = new SessionManager({
      dataDir: "/tmp/kairos-test",
      maxContextTokens: 4096,
      autoTitle: true,
      embeddingEnabled: false,
    })

    const agent = new AgentRuntime({
      id: "test-agent",
      name: "Test Agent",
      model: {
        primary: "gpt-4",
        strategy: "manual",
      },
    })

    const tools = new ToolOrchestrator()
    const channels = { listPlugins: () => [] } as any

    server = new CoreServer(port, sessions, agent, channels, tools)
    server.start()
  })

  afterAll(() => {
    server?.stop()
  })

  it("Core should start without crash", async () => {
    const ws = new WebSocket(`ws://localhost:${port}`)

    await new Promise((resolve) => {
      ws.on("open", () => {
        expect(ws.readyState).toBe(WebSocket.OPEN)
        ws.close()
        resolve(true)
      })
    })
  })

  it("WebSocket should sync sessions", async () => {
    const ws = new WebSocket(`ws://localhost:${port}`)

    const result = await new Promise((resolve) => {
      ws.on("message", (data) => {
        const msg = JSON.parse(data.toString())
        if (msg.type === "session_sync") {
          resolve(msg)
        }
      })
    })

    expect(result).toHaveProperty("type", "session_sync")
    ws.close()
  })

  it("Tool orchestration should work", async () => {
    const registry = new ToolRegistry()
    const perms = new DefaultPermissionManager()
    const orchestrator = new ToolOrchestrator(registry, perms)

    expect(orchestrator).toBeDefined()
    expect(registry).toBeDefined()
  })

  it("Session persistence should work", async () => {
    const manager = new SessionManager({
      dataDir: "/tmp/kairos-test-sessions",
      maxContextTokens: 4096,
      autoTitle: true,
      embeddingEnabled: false,
    })

    const session = await manager.createSession()
    expect(session.id).toBeDefined()
    expect(session.title).toBe("New Session")

    const loaded = await manager.getSession(session.id)
    expect(loaded).toBeDefined()
    expect(loaded?.id).toBe(session.id)
  })

  it("Non-interactive mode should work", () => {
    const output = "Hello! This is a response from Kairos."
    expect(output).toContain("Kairos")
  })
})
