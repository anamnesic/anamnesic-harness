import { describe, it, expect, vi, beforeEach } from "vitest"
import { CoreCLIManager } from "../cli"
import { CoreCommand } from "../cli/commands"
import { SessionsCommand } from "../cli/commands"
import { SessionManager } from "../sessions"

describe("CLI End-to-End", () => {
  let manager: CoreCLIManager
  let output: string[]

  beforeEach(() => {
    output = []
    manager = new CoreCLIManager()

    const sessions = new SessionManager({
      dataDir: "/tmp/kairos-cli-test",
      maxContextTokens: 4096,
      autoTitle: true,
      embeddingEnabled: false,
    })

    manager.register(new CoreCommand())
    manager.register(new SessionsCommand(sessions))
  })

  it("should list available commands", () => {
    const commands = manager.listCommands()
    expect(commands.length).toBeGreaterThan(0)
    expect(commands.some((c) => c.name === "core")).toBe(true)
    expect(commands.some((c) => c.name === "sessions")).toBe(true)
  })

  it("should execute core command", async () => {
    const originalLog = console.log
    console.log = (msg: string) => output.push(msg)

    await manager.execute("core", {
      command: "core",
      args: [],
      flags: {},
    })

    console.log = originalLog
    expect(output.some((o) => o.includes("Kairos Core"))).toBe(true)
  })

  it("should execute sessions list command", async () => {
    const originalLog = console.log
    console.log = (msg: string) => output.push(msg)

    await manager.execute("sessions", {
      command: "sessions",
      args: ["list"],
      flags: {},
    })

    console.log = originalLog
    expect(output.length).toBeGreaterThan(0)
  })
})
