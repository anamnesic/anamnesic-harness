import crypto from 'crypto';
import { getDatabase } from '../database';
import { Session } from '../entities/Session';
import { SessionMessage } from '../entities/SessionMessage';
import { SessionStore } from './SessionStore';
import { LanceDBEmbeddingsService } from './LanceDBEmbeddings';

const DEFAULT_CONTEXT_WINDOW = 128000; // tokens
const AUTO_TITLE_MESSAGE_COUNT = 2; // Generate title after N messages

export class SessionService {
  private store: SessionStore;
  private lancedb: LanceDBEmbeddingsService;

  constructor() {
    this.store = new SessionStore();
    this.lancedb = new LanceDBEmbeddingsService();
  }

  async createSession(model?: string): Promise<Session> {
    const db = await getDatabase();
    const sessionRepo = db.getRepository(Session);

    const session = sessionRepo.create({
      id: crypto.randomUUID(),
      title: null,
      autoTitle: null,
      messageCount: 0,
      totalTokens: 0,
      contextWindowSize: 0,
      maxContextWindow: DEFAULT_CONTEXT_WINDOW,
      model: model || null,
      isArchived: false,
      lancedbTable: `session_${crypto.randomUUID().replace(/-/g, '_')}`,
      metadata: {},
    });

    await sessionRepo.save(session);

    // Initialize JSONL store and LanceDB table
    this.store.saveSessionMetadata(this.sessionToRecord(session));
    await this.lancedb.createTable(session.id);

    return session;
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    options?: {
      tokenCount?: number;
      promptTokens?: number;
      completionTokens?: number;
      model?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<SessionMessage> {
    const db = await getDatabase();
    const sessionRepo = db.getRepository(Session);
    const messageRepo = db.getRepository(SessionMessage);

    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new Error(`Session ${sessionId} not found`);

    // Estimate tokens if not provided (rough: 4 chars ~ 1 token)
    const tokenCount =
      options?.tokenCount || Math.ceil(content.length / 4);

    const message = messageRepo.create({
      id: crypto.randomUUID(),
      sessionId,
      role,
      content,
      tokenCount,
      promptTokens: options?.promptTokens || null,
      completionTokens: options?.completionTokens || null,
      model: options?.model || session.model,
      metadata: options?.metadata || null,
    });

    await messageRepo.save(message);

    // Update session stats
    session.messageCount += 1;
    session.totalTokens += tokenCount;
    session.contextWindowSize =
      (session.contextWindowSize || 0) + tokenCount;
    session.updatedAt = new Date();

    // Auto-title after first user message
    if (
      role === 'user' &&
      session.messageCount >= AUTO_TITLE_MESSAGE_COUNT &&
      !session.autoTitle
    ) {
      session.autoTitle = await this.generateAutoTitle(content);
    }

    await sessionRepo.save(session);

    // Append to JSONL
    this.store.appendMessage(sessionId, {
      role,
      content,
      tokenCount,
      promptTokens: options?.promptTokens,
      completionTokens: options?.completionTokens,
      model: options?.model || session.model || undefined,
      metadata: options?.metadata,
    });

    // Add embedding to LanceDB
    await this.lancedb.addEmbedding(
      sessionId,
      message.id,
      content,
      role
    );

    // Update JSON metadata
    this.store.saveSessionMetadata(this.sessionToRecord(session));

    return message;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const db = await getDatabase();
    return db.getRepository(Session).findOne({
      where: { id: sessionId },
      relations: ['messages'],
    });
  }

  async getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
    const db = await getDatabase();
    return db.getRepository(SessionMessage).find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async listSessions(limit?: number): Promise<Session[]> {
    const db = await getDatabase();
    const query = db
      .getRepository(Session)
      .createQueryBuilder('session')
      .where('session.isArchived = :archived', { archived: false })
      .orderBy('session.updatedAt', 'DESC');

    if (limit) query.take(limit);
    return query.getMany();
  }

  async archiveSession(sessionId: string): Promise<void> {
    const db = await getDatabase();
    await db
      .getRepository(Session)
      .update(sessionId, { isArchived: true });
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await getDatabase();
    await db.getRepository(Session).delete(sessionId);
    this.store.deleteSession(sessionId);
    await this.lancedb.deleteTable(sessionId);
  }

  getContextUsage(sessionId: string): {
    used: number;
    max: number;
    percentage: number;
  } {
    const metadata = this.store.getSessionMetadata(sessionId);
    if (!metadata) return { used: 0, max: DEFAULT_CONTEXT_WINDOW, percentage: 0 };

    const used = metadata.contextWindowSize || 0;
    const max = metadata.maxContextWindow || DEFAULT_CONTEXT_WINDOW;
    return {
      used,
      max,
      percentage: Math.round((used / max) * 100),
    };
  }

  async searchSimilarMessages(
    sessionId: string,
    query: string,
    limit?: number
  ): Promise<any[]> {
    return this.lancedb.searchSimilar(sessionId, query, limit);
  }

  private async generateAutoTitle(firstMessage: string): Promise<string> {
    // Simple auto-title: first 50 chars of first message
    const cleaned = firstMessage.trim().replace(/\n+/g, ' ');
    return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
  }

  private sessionToRecord(session: Session): any {
    return {
      id: session.id,
      title: session.title,
      autoTitle: session.autoTitle,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messageCount: session.messageCount,
      totalTokens: session.totalTokens,
      contextWindowSize: session.contextWindowSize,
      maxContextWindow: session.maxContextWindow,
      model: session.model,
      isArchived: session.isArchived,
      lancedbTable: session.lancedbTable,
    };
  }
}
