import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { SessionManager } from "../sessions"
import { randomUUID } from "crypto"
import { rmSync, existsSync } from "fs"

describe("Sessions End-to-End", () => {
  let manager: SessionManager
  const testDir = "/tmp/kairos-session-test"

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }

    manager = new SessionManager({
      dataDir: testDir,
      maxContextTokens: 4096,
      autoTitle: true,
      embeddingEnabled: false,
    })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true })
    }
  })

  it("should create session", async () => {
    const session = await manager.createSession()
    expect(session.id).toBeDefined()
    expect(session.title).toBe("New Session")
    expect(session.messageCount).toBe(0)
  })

  it("should auto-title session", async () => {
    const session = await manager.createSession()

    await manager.addMessage(session.id, {
      role: "user",
      content: "This is a test message for auto-titling",
    }, 20)

    const updated = await manager.getSession(session.id)
    expect(updated?.title).not.toBe("New Session")
    expect(updated?.title).toContain("This is a test")
  })

  it("should persist messages in JSONL", async () => {
    const session = await manager.createSession()

    await manager.addMessage(session.id, {
      role: "user",
      content: "Message 1",
    }, 10)

    await manager.addMessage(session.id, {
      role: "assistant",
      content: "Response 1",
    }, 15)

    const context = await manager.getContextWindow(session.id)
    expect(context.messages.length).toBe(2)
  })

  it("should list sessions", async () => {
    await manager.createSession()
    await manager.createSession()
    await manager.createSession()

    const sessions = await manager.listSessions()
    expect(sessions.length).toBe(3)
  })

  it("should track context window", async () => {
    const session = await manager.createSession()

    for (let i = 0; i < 10; i++) {
      await manager.addMessage(session.id, {
        role: "user",
        content: `Message ${i}`,
      }, 100)
    }

    const context = await manager.getContextWindow(session.id)
    expect(context.tokensUsed).toBeGreaterThan(0)
    expect(context.maxTokens).toBe(4096)
  })
})
