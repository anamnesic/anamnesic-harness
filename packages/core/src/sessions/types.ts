export interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
  tokenCount: number
  metadata: SessionMetadata
}

export interface SessionMetadata {
  agentId?: string
  model?: string
  tags?: string[]
  workingDirectory?: string
  contextWindowSize: number
  custom?: Record<string, unknown>
}

export interface MessageRecord {
  id: string
  sessionId: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestamp: number
  tokens: number
  toolCalls?: ToolCallRecord[]
  metadata?: Record<string, unknown>
}

export interface ToolCallRecord {
  name: string
  args: Record<string, unknown>
  result?: unknown
  duration: number
}

export interface SessionStorage {
  saveMessage(message: MessageRecord): Promise<void>
  loadMessages(sessionId: string): Promise<MessageRecord[]>
  appendMessage(message: MessageRecord): Promise<void>
}

export interface SessionMetadataStore {
  createSession(session: Session): Promise<void>
  updateSession(session: Partial<Session> & { id: string }): Promise<void>
  getSession(id: string): Promise<Session | undefined>
  listSessions(): Promise<Session[]>
  deleteSession(id: string): Promise<void>
}

export interface EmbeddingStore {
  storeEmbedding(
    messageId: string,
    embedding: number[],
    metadata?: Record<string, unknown>,
  ): Promise<void>
  searchSimilar(
    queryEmbedding: number[],
    limit?: number,
  ): Promise<MessageEmbedding[]>
}

export interface MessageEmbedding {
  messageId: string
  embedding: number[]
  score: number
  metadata?: Record<string, unknown>
}

export interface ContextWindow {
  tokensUsed: number
  maxTokens: number
  messages: MessageRecord[]
  truncated: boolean
}

export interface SessionManagerConfig {
  dataDir: string
  maxContextTokens: number
  autoTitle: boolean
  embeddingEnabled: boolean
}
