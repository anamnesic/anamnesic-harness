import type { MessageRecord, SessionStorage } from "./types"
import { appendFile, readFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"

export class JSONLSessionStorage implements SessionStorage {
  private baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
  }

  private getSessionFile(sessionId: string): string {
    return join(this.baseDir, "sessions", `${sessionId}.jsonl`)
  }

  async appendMessage(message: MessageRecord): Promise<void> {
    const filePath = this.getSessionFile(message.sessionId)
    const dir = join(this.baseDir, "sessions")

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    const line = JSON.stringify(message) + "\n"
    await appendFile(filePath, line, "utf-8")
  }

  async saveMessage(message: MessageRecord): Promise<void> {
    await this.appendMessage(message)
  }

  async loadMessages(sessionId: string): Promise<MessageRecord[]> {
    const filePath = this.getSessionFile(sessionId)

    if (!existsSync(filePath)) {
      return []
    }

    const content = await readFile(filePath, "utf-8")
    const lines = content.trim().split("\n").filter(Boolean)

    return lines
      .map((line) => {
        try {
          return JSON.parse(line) as MessageRecord
        } catch {
          return null
        }
      })
      .filter((msg): msg is MessageRecord => msg !== null)
  }
}
