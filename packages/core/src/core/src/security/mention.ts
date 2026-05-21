export interface MentionContext {
  message: string
  mentions: string[]
  isGroup: boolean
  channelId: string
  userId: string
}

export class MentionGate {
  private botName: string = "kairos"
  private enabled: boolean = true

  setBotName(name: string): void {
    this.botName = name.toLowerCase()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  shouldRespond(context: MentionContext): boolean {
    if (!this.enabled) {
      return true
    }

    if (!context.isGroup) {
      return true
    }

    return context.mentions.some(
      (m) => m.toLowerCase() === this.botName,
    )
  }

  extractMentionText(message: string, botName: string): string {
    const mentionPattern = new RegExp(`@?${botName}[:\\s]*(.*)`, "i")
    const match = message.match(mentionPattern)
    return match ? match[1].trim() : message
  }
}
