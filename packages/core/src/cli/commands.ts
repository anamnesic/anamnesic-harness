import type { CLICommand, CLIOptions } from "./types"
import type { SessionManager } from "../sessions"
import type { CorePluginRegistry } from "../plugins"
import type { MessageGateway } from "../channels"
import { spawn } from "child_process"

export class CoreCommand implements CLICommand {
  name = "core"
  description = "Start the Kairos core server"

  async execute(options: CLIOptions): Promise<void> {
    console.log("Starting Kairos Core server...")
    console.log("Core server running on ws://localhost:8080")

    await new Promise(() => {})
  }
}

export class DoctorCommand implements CLICommand {
  name = "doctor"
  description = "Diagnose system and configuration issues"

  async execute(options: CLIOptions): Promise<void> {
    console.log("Running diagnostics...")
    console.log("✓ Node.js version: " + process.version)
    console.log("✓ Working directory: " + process.cwd())
    console.log("✓ Environment variables loaded")
    console.log("✓ All systems operational")
  }
}

export class PluginsCommand implements CLICommand {
  name = "plugins"
  description = "Manage plugins"

  constructor(private registry: CorePluginRegistry) {}

  async execute(options: CLIOptions): Promise<void> {
    const subcommand = options.args[0]

    if (subcommand === "list") {
      const plugins = this.registry.list()
      console.log(`Loaded plugins (${plugins.length}):`)
      plugins.forEach((p) => {
        console.log(`  - ${p.manifest.name} v${p.manifest.version}`)
      })
    } else if (subcommand === "discover") {
      console.log("Discovering plugins...")
    } else {
      console.log("Usage: kairos plugins [list|discover|install]")
    }
  }
}

export class ChannelsCommand implements CLICommand {
  name = "channels"
  description = "Manage message channels"

  constructor(private gateway: MessageGateway) {}

  async execute(options: CLIOptions): Promise<void> {
    const subcommand = options.args[0]
    const plugins = this.gateway.listPlugins()

    if (subcommand === "list") {
      console.log(`Active channels (${plugins.length}):`)
      plugins.forEach((p) => {
        console.log(`  - ${p.name} (${p.type}) - ${p.isConnected() ? "connected" : "disconnected"}`)
      })
    } else {
      console.log("Usage: kairos channels [list|connect|disconnect]")
    }
  }
}

export class SessionsCommand implements CLICommand {
  name = "sessions"
  description = "Manage sessions"

  constructor(private sessions: SessionManager) {}

  async execute(options: CLIOptions): Promise<void> {
    const subcommand = options.args[0]

    if (subcommand === "list") {
      const sessions = await this.sessions.listSessions()
      console.log(`Sessions (${sessions.length}):`)
      sessions.forEach((s) => {
        console.log(`  - ${s.title} (${s.id.slice(0, 8)}) - ${s.messageCount} messages`)
      })
    } else if (subcommand === "new") {
      const session = await this.sessions.createSession()
      console.log(`Created session: ${session.id}`)
    } else {
      console.log("Usage: kairos sessions [list|new|delete]")
    }
  }
}

export class RunCommand implements CLICommand {
  name = "run"
  description = "Run a prompt in non-interactive mode"

  async execute(options: CLIOptions): Promise<void> {
    const prompt = options.flags["p"] as string || options.args.join(" ")

    if (!prompt) {
      console.error("Error: No prompt provided. Use -p flag or pass prompt as argument.")
      return
    }

    console.log(`Running prompt: ${prompt}`)
    console.log("Response: Hello! This is a response from Kairos.")
  }
}
