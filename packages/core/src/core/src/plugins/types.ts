export interface PluginManifest {
  name: string
  version: string
  description: string
  author?: string
  type: "tool" | "channel" | "provider" | "ui"
  main: string
  dependencies?: Record<string, string>
  configSchema?: Record<string, unknown>
  permissions?: string[]
  autoStart?: boolean
  npm?: string
  local?: string
}

export interface PluginContext {
  config: Record<string, unknown>
  workingDirectory: string
  tempDir: string
  logger: PluginLogger
}

export interface PluginLogger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
  debug(message: string): void
}

export interface PluginInstance {
  manifest: PluginManifest
  start(context: PluginContext): Promise<void>
  stop(): Promise<void>
  isRunning(): boolean
  getTools?(): any[]
  getChannels?(): any[]
  getProviders?(): any[]
}

export interface PluginRegistry {
  discover(paths: string[]): Promise<PluginManifest[]>
  load(manifest: PluginManifest): Promise<PluginInstance>
  unload(name: string): Promise<void>
  get(name: string): PluginInstance | undefined
  list(): PluginInstance[]
}
