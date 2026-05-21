export interface ChannelPlugin {
  name: string
  type: "discord" | "telegram" | "slack" | "whatsapp" | "matrix" | "signal" | "imessage" | "irc" | "teams" | "custom"
  manifest: ChannelManifest
  connect(): Promise<void>
  disconnect(): Promise<void>
  sendMessage(message: OutgoingMessage): Promise<void>
  onMessage(handler: (msg: IncomingMessage) => void): void
  isConnected(): boolean
}

export interface ChannelManifest {
  name: string
  version: string
  description: string
  author?: string
  type: string
  configSchema?: Record<string, unknown>
  permissions?: string[]
  allowlist?: string[]
  mentionRequired?: boolean
}

export interface IncomingMessage {
  id: string
  channel: string
  from: User
  content: string
  timestamp: number
  isGroup?: boolean
  mentions?: string[]
  metadata?: Record<string, unknown>
}

export interface OutgoingMessage {
  channel: string
  to?: string
  content: string
  replyTo?: string
  metadata?: Record<string, unknown>
}

export interface User {
  id: string
  name: string
  isOwner?: boolean
  roles?: string[]
}

export interface ChannelGateway {
  registerPlugin(plugin: ChannelPlugin): void
  unregisterPlugin(name: string): void
  getPlugin(name: string): ChannelPlugin | undefined
  listPlugins(): ChannelPlugin[]
  broadcast(message: OutgoingMessage): Promise<void>
  onMessage(handler: (msg: IncomingMessage) => void): void
}
