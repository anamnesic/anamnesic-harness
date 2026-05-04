import type { Session, SessionMetadataStore } from "./types"

export class SQLiteSessionMetadataStore implements SessionMetadataStore {
  private db: any

  constructor(dbPath: string) {
    this.db = { path: dbPath }
  }

  async createSession(session: Session): Promise<void> {
    await this.simulateQuery(
      "INSERT INTO sessions (id, title, createdAt, updatedAt, messageCount, tokenCount, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        session.id,
        session.title,
        session.createdAt,
        session.updatedAt,
        session.messageCount,
        session.tokenCount,
        JSON.stringify(session.metadata),
      ],
    )
  }

  async updateSession(
    session: Partial<Session> & { id: string },
  ): Promise<void> {
    const fields: string[] = []
    const values: unknown[] = []

    if (session.title !== undefined) {
      fields.push("title = ?")
      values.push(session.title)
    }
    if (session.updatedAt !== undefined) {
      fields.push("updatedAt = ?")
      values.push(session.updatedAt)
    }
    if (session.messageCount !== undefined) {
      fields.push("messageCount = ?")
      values.push(session.messageCount)
    }
    if (session.tokenCount !== undefined) {
      fields.push("tokenCount = ?")
      values.push(session.tokenCount)
    }
    if (session.metadata !== undefined) {
      fields.push("metadata = ?")
      values.push(JSON.stringify(session.metadata))
    }

    values.push(session.id)

    await this.simulateQuery(
      `UPDATE sessions SET ${fields.join(", ")} WHERE id = ?`,
      values,
    )
  }

  async getSession(id: string): Promise<Session | undefined> {
    const rows = await this.simulateQuery(
      "SELECT * FROM sessions WHERE id = ?",
      [id],
    )
    return rows[0] ? this.parseSession(rows[0]) : undefined
  }

  async listSessions(): Promise<Session[]> {
    const rows = await this.simulateQuery(
      "SELECT * FROM sessions ORDER BY updatedAt DESC",
      [],
    )
    return rows.map((row: any) => this.parseSession(row))
  }

  async deleteSession(id: string): Promise<void> {
    await this.simulateQuery("DELETE FROM sessions WHERE id = ?", [id])
  }

  private parseSession(row: any): Session {
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

  private async simulateQuery(
    sql: string,
    params: unknown[],
  ): Promise<any[]> {
    return []
  }
}
