export interface AllowlistEntry {
  channelId: string
  userId?: string
  type: "channel" | "user" | "both"
  addedAt: number
}

export class ChannelAllowlist {
  private entries: AllowlistEntry[] = []

  addChannel(channelId: string): void {
    if (this.isChannelAllowed(channelId)) {
      return
    }

    this.entries.push({
      channelId,
      type: "channel",
      addedAt: Date.now(),
    })
  }

  addUser(userId: string, channelId: string): void {
    if (this.isUserAllowed(userId, channelId)) {
      return
    }

    this.entries.push({
      channelId,
      userId,
      type: "user",
      addedAt: Date.now(),
    })
  }

  removeChannel(channelId: string): void {
    this.entries = this.entries.filter(
      (e) => e.channelId !== channelId || e.userId,
    )
  }

  removeUser(userId: string, channelId: string): void {
    this.entries = this.entries.filter(
      (e) => !(e.userId === userId && e.channelId === channelId),
    )
  }

  isChannelAllowed(channelId: string): boolean {
    return this.entries.some(
      (e) => e.channelId === channelId && !e.userId,
    )
  }

  isUserAllowed(userId: string, channelId: string): boolean {
    return this.entries.some(
      (e) =>
        e.channelId === channelId &&
        (e.userId === userId || !e.userId),
    )
  }

  checkAccess(userId: string, channelId: string): AccessResult {
    if (this.isUserAllowed(userId, channelId)) {
      return { allowed: true }
    }

    if (this.isChannelAllowed(channelId)) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `User ${userId} not in allowlist for channel ${channelId}`,
    }
  }

  listEntries(): AllowlistEntry[] {
    return [...this.entries]
  }
}

export interface AccessResult {
  allowed: boolean
  reason?: string
}
