import type {
  Session,
  SessionManagerConfig,
  MessageRecord,
  ContextWindow,
} from "./types"
import { JSONLSessionStorage } from "./jsonl-storage.js"
import { SQLiteSessionMetadataStore } from "./metadata-store.js"
import { LanceDBEmbeddingStore } from "./embedding-store.js"
import { randomUUID } from "crypto"

export class SessionManager {
  private config: SessionManagerConfig
  private storage: JSONLSessionStorage
  private metadataStore: SQLiteSessionMetadataStore
  private embeddingStore?: LanceDBEmbeddingStore

  constructor(config: SessionManagerConfig) {
    this.config = config
    this.storage = new JSONLSessionStorage(config.dataDir)
    this.metadataStore = new SQLiteSessionMetadataStore(
      `${config.dataDir}/metadata.db`,
    )

    if (config.embeddingEnabled) {
      this.embeddingStore = new LanceDBEmbeddingStore()
    }
  }

  async createSession(metadata?: Session["metadata"]): Promise<Session> {
    const session: Session = {
      id: randomUUID(),
      title: "New Session",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      tokenCount: 0,
      metadata: {
        contextWindowSize: this.config.maxContextTokens,
        ...metadata,
      },
    }

    await this.metadataStore.createSession(session)
    return session
  }

  async addMessage(
    sessionId: string,
    message: Omit<MessageRecord, "id" | "sessionId" | "timestamp" | "tokens">,
    tokens: number,
  ): Promise<MessageRecord> {
    const record: MessageRecord = {
      id: randomUUID(),
      sessionId,
      timestamp: Date.now(),
      tokens,
      ...message,
    }

    await this.storage.appendMessage(record)

    const session = await this.metadataStore.getSession(sessionId)
    if (session) {
      await this.metadataStore.updateSession({
        id: sessionId,
        messageCount: session.messageCount + 1,
        tokenCount: session.tokenCount + tokens,
        updatedAt: Date.now(),
      })

      if (this.config.autoTitle && session.messageCount === 0) {
        await this.autoTitleSession(sessionId, message.content)
      }
    }

    if (this.embeddingStore && this.config.embeddingEnabled) {
      const embedding = await this.generateEmbedding(message.content)
      await this.embeddingStore.storeEmbedding(record.id, embedding, {
        sessionId,
        role: message.role,
      })
    }

    return record
  }

  async getContextWindow(sessionId: string): Promise<ContextWindow> {
    const messages = await this.storage.loadMessages(sessionId)
    const session = await this.metadataStore.getSession(sessionId)

    const maxTokens = session?.metadata.contextWindowSize ?? this.config.maxContextTokens
    let tokensUsed = 0
    const includedMessages: MessageRecord[] = []

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (tokensUsed + msg.tokens > maxTokens) {
        return {
          tokensUsed,
          maxTokens,
          messages: includedMessages.reverse(),
          truncated: true,
        }
      }
      tokensUsed += msg.tokens
      includedMessages.push(msg)
    }

    return {
      tokensUsed,
      maxTokens,
      messages: includedMessages.reverse(),
      truncated: false,
    }
  }

  async searchSimilarMessages(
    queryEmbedding: number[],
    limit?: number,
  ): Promise<import("./types").MessageEmbedding[]> {
    if (!this.embeddingStore) {
      return []
    }
    return this.embeddingStore.searchSimilar(queryEmbedding, limit)
  }

  private async autoTitleSession(
    sessionId: string,
    firstMessage: string,
  ): Promise<void> {
    const title = firstMessage.slice(0, 50).trim()
    await this.metadataStore.updateSession({
      id: sessionId,
      title: title + (firstMessage.length > 50 ? "..." : ""),
    })
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const embedding = new Array(128).fill(0).map(() => Math.random())
    return embedding
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.metadataStore.getSession(id)
  }

  async listSessions(): Promise<Session[]> {
    return this.metadataStore.listSessions()
  }

  async deleteSession(id: string): Promise<void> {
    await this.metadataStore.deleteSession(id)
  }
}
