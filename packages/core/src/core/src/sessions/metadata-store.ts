import type { Session, SessionMetadataStore } from "./types"

interface SessionRow {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  tokenCount: number
  metadata: string
}

export class SQLiteSessionMetadataStore implements SessionMetadataStore {
  private sessions: Map<string, SessionRow> = new Map()

  constructor(dbPath: string) {
    // In-memory store for now
  }

  async createSession(session: Session): Promise<void> {
    this.sessions.set(session.id, {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messageCount,
      tokenCount: session.tokenCount,
      metadata: JSON.stringify(session.metadata),
    })
  }

  async updateSession(
    session: Partial<Session> & { id: string },
  ): Promise<void> {
    const existing = this.sessions.get(session.id)
    if (!existing) return

    if (session.title !== undefined) existing.title = session.title
    if (session.updatedAt !== undefined) existing.updatedAt = session.updatedAt
    if (session.messageCount !== undefined) existing.messageCount = session.messageCount
    if (session.tokenCount !== undefined) existing.tokenCount = session.tokenCount
    if (session.metadata !== undefined) existing.metadata = JSON.stringify(session.metadata)
  }

  async getSession(id: string): Promise<Session | undefined> {
    const row = this.sessions.get(id)
    return row ? this.parseSession(row) : undefined
  }

  async listSessions(): Promise<Session[]> {
    const sessions = Array.from(this.sessions.values())
    sessions.sort((a, b) => b.updatedAt - a.updatedAt)
    return sessions.map((row) => this.parseSession(row))
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id)
  }

  private parseSession(row: SessionRow): Session {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      messageCount: row.messageCount,
      tokenCount: row.tokenCount,
      metadata: JSON.parse(row.metadata ?? "{}"),
    }
  }
}
