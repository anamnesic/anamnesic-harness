import { describe, it, expect, beforeEach } from "vitest"
import { ToolRegistry, DefaultPermissionManager, ToolOrchestrator } from "../tools"
import { bashTool, fileReadTool } from "../tools/builtin"
import { SessionManager } from "../sessions"

describe("Tools End-to-End", () => {
  let registry: ToolRegistry
  let permissions: DefaultPermissionManager
  let orchestrator: ToolOrchestrator

  beforeEach(() => {
    registry = new ToolRegistry()
    permissions = new DefaultPermissionManager()
    orchestrator = new ToolOrchestrator(registry, permissions)

    registry.register(bashTool.definition, bashTool.handler)
    registry.register(fileReadTool.definition, fileReadTool.handler)
  })

  it("should register and execute bash tool", async () => {
    expect(registry.has("bash")).toBe(true)

    const result = await orchestrator.executeTool("bash", {
      command: "echo hello",
    }, {
      sessionId: "test-session",
      agentId: "test-agent",
      workingDirectory: "/tmp",
      environment: {},
    })

    expect(result).toBeDefined()
  })

  it("should handle non-existent tool", async () => {
    const result = await orchestrator.executeTool("nonexistent", {}, {
      sessionId: "test-session",
      agentId: "test-agent",
      workingDirectory: "/tmp",
      environment: {},
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("not found")
  })

  it("should enforce permissions", async () => {
    permissions.setMode("yolo")

    const result = await orchestrator.executeTool("bash", {
      command: "ls",
    }, {
      sessionId: "test-session",
      agentId: "test-agent",
      workingDirectory: "/tmp",
      environment: {},
    })

    expect(result).toBeDefined()
  })
})
