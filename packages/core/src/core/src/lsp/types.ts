export interface LSPServerConfig {
  name: string
  command: string
  args: string[]
  rootUri: string
  workspaceFolders?: string[]
}

export interface Diagnostic {
  uri: string
  severity: "error" | "warning" | "info" | "hint"
  message: string
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  source?: string
}

export interface LSPServer {
  start(): Promise<void>
  stop(): Promise<void>
  isRunning(): boolean
  getDiagnostics(): Promise<Diagnostic[]>
  watchFiles(patterns: string[]): void
}

export interface LSPManager {
  spawnServer(config: LSPServerConfig): Promise<void>
  stopServer(name: string): Promise<void>
  getDiagnostics(name?: string): Promise<Diagnostic[]>
  listServers(): string[]
  onDiagnostics(handler: (diagnostics: Diagnostic[]) => void): void
}
