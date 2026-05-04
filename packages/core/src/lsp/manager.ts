import type { LSPServerConfig, Diagnostic, LSPServer } from "./types"
import { spawn } from "child_process"

class SimpleLSPServer implements LSPServer {
  private config: LSPServerConfig
  private process?: any
  private running = false
  private diagnostics: Diagnostic[] = []

  constructor(config: LSPServerConfig) {
    this.config = config
  }

  async start(): Promise<void> {
    this.process = spawn(this.config.command, this.config.args, {
      cwd: this.config.rootUri,
    })
    this.running = true

    this.process.on("exit", () => {
      this.running = false
    })
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill()
      this.running = false
    }
  }

  isRunning(): boolean {
    return this.running
  }

  async getDiagnostics(): Promise<Diagnostic[]> {
    return this.diagnostics
  }

  watchFiles(patterns: string[]): void {
    // File watching would be implemented here
  }

  updateDiagnostics(diagnostics: Diagnostic[]): void {
    this.diagnostics = diagnostics
  }
}

export class LSPManager implements LSPManager {
  private servers: Map<string, SimpleLSPServer> = new Map()
  private listeners: Set<(diagnostics: Diagnostic[]) => void> = new Set()

  async spawnServer(config: LSPServerConfig): Promise<void> {
    if (this.servers.has(config.name)) {
      throw new Error(`LSP server ${config.name} already running`)
    }

    const server = new SimpleLSPServer(config)
    await server.start()
    this.servers.set(config.name, server)
  }

  async stopServer(name: string): Promise<void> {
    const server = this.servers.get(name)
    if (server) {
      await server.stop()
      this.servers.delete(name)
    }
  }

  async getDiagnostics(name?: string): Promise<Diagnostic[]> {
    if (name) {
      const server = this.servers.get(name)
      return server ? await server.getDiagnostics() : []
    }

    const all: Diagnostic[] = []
    for (const server of this.servers.values()) {
      const diags = await server.getDiagnostics()
      all.push(...diags)
    }
    return all
  }

  listServers(): string[] {
    return Array.from(this.servers.keys()).filter(
      (name) => this.servers.get(name)?.isRunning(),
    )
  }

  onDiagnostics(handler: (diagnostics: Diagnostic[]) => void): void {
    this.listeners.add(handler)
  }

  notifyDiagnostics(diagnostics: Diagnostic[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(diagnostics)
      } catch {
        // Listener error
      }
    })
  }
}
