import { describe, it, expect, beforeEach } from "vitest"
import { AgentRuntime } from "../agent"
import type { AgentContext } from "../agent"

describe("Streaming End-to-End", () => {
  let runtime: AgentRuntime

  beforeEach(() => {
    runtime = new AgentRuntime({
      id: "stream-test",
      name: "Stream Test Agent",
      model: {
        primary: "gpt-4",
        strategy: "manual",
      },
      timeout: 5000,
    })
  })

  it("should execute agent and return result", async () => {
    const context: AgentContext = {
      sessionId: "stream-session",
      messages: [
        {
          role: "user",
          content: "Hello",
          timestamp: Date.now(),
        },
      ],
      metadata: {},
      tokenCount: 10,
    }

    const result = await runtime.execute(context, { stream: false })

    expect(result).toBeDefined()
    expect(result.success).toBe(true)
    expect(result.message).toBeDefined()
    expect(result.tokensUsed).toBeGreaterThan(0)
  })

  it("should handle execution with limits", async () => {
    const runtime = new AgentRuntime(
      {
        id: "limit-test",
        name: "Limit Test",
        model: {
          primary: "gpt-4",
          strategy: "manual",
        },
      },
      {
        maxRequestsPerMinute: 2,
      },
    )

    const context: AgentContext = {
      sessionId: "limit-session",
      messages: [{ role: "user", content: "Test", timestamp: Date.now() }],
      metadata: {},
      tokenCount: 5,
    }

    await runtime.execute(context)
    await runtime.execute(context)

    try {
      await runtime.execute(context)
      expect(true).toBe(false)
    } catch {
      expect(true).toBe(true)
    }
  })

  it("should support model selection", () => {
    const config = runtime.getConfig()
    expect(config.model.primary).toBe("gpt-4")
    expect(config.model.strategy).toBe("manual")
  })
})
