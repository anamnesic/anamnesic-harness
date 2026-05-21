import type { ChannelPlugin, ChannelGateway, IncomingMessage, OutgoingMessage } from "./types"

export class MessageGateway implements ChannelGateway {
  private plugins: Map<string, ChannelPlugin> = new Map()
  private messageHandlers: Set<(msg: IncomingMessage) => void> = new Set()

  registerPlugin(plugin: ChannelPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`)
    }

    plugin.onMessage((msg) => {
      this.handleIncomingMessage(msg)
    })

    this.plugins.set(plugin.name, plugin)
  }

  unregisterPlugin(name: string): boolean {
    const plugin = this.plugins.get(name)
    if (plugin) {
      plugin.disconnect()
      return this.plugins.delete(name)
    }
    return false
  }

  getPlugin(name: string): ChannelPlugin | undefined {
    return this.plugins.get(name)
  }

  listPlugins(): ChannelPlugin[] {
    return Array.from(this.plugins.values())
  }

  async broadcast(message: OutgoingMessage): Promise<void> {
    const promises = Array.from(this.plugins.values())
      .filter((p) => p.isConnected())
      .map((p) => p.sendMessage(message).catch(() => {}))

    await Promise.all(promises)
  }

  onMessage(handler: (msg: IncomingMessage) => void): void {
    this.messageHandlers.add(handler)
  }

  private handleIncomingMessage(msg: IncomingMessage): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(msg)
      } catch {
        // Handler failed, continue
      }
    }
  }
}
