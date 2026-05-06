import lancedb from '@lancedb/lancedb';
import path from 'path';
import os from 'os';
import fs from 'fs';

interface EmbeddingRecord {
  id: string;
  sessionId: string;
  messageId: string;
  content: string;
  embedding: number[];
  timestamp: string;
  role: string;
}

export class LanceDBEmbeddingsService {
  private db: any = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(os.homedir(), '.kairos', 'lancedb');
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  private async getDB() {
    if (!this.db) {
      this.db = await lancedb.connect(this.dbPath);
    }
    return this.db;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple hash-based embedding for prototype (replace with real embedding API)
    // In production, use Ollama, OpenAI, or HuggingFace transformers
    const vector = new Array(384).fill(0);
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      vector[i % 384] += charCode / 255;
      vector[(i + 1) % 384] += (charCode * 7) % 255 / 255;
    }
    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map((v) => (norm > 0 ? v / norm : 0));
  }

  async createTable(sessionId: string): Promise<void> {
    const db = await this.getDB();
    const tableName = `session_${sessionId.replace(/-/g, '_')}`;

    try {
      await db.openTable(tableName);
    } catch {
      await db.createTable(tableName, [
        {
          id: 'init',
          sessionId,
          messageId: 'init',
          content: '',
          embedding: new Array(384).fill(0),
          timestamp: new Date().toISOString(),
          role: 'system',
        },
      ]);
    }
  }

  async addEmbedding(
    sessionId: string,
    messageId: string,
    content: string,
    role: string
  ): Promise<void> {
    const db = await this.getDB();
    const tableName = `session_${sessionId.replace(/-/g, '_')}`;
    const embedding = await this.generateEmbedding(content);

    const record: EmbeddingRecord = {
      id: `${sessionId}_${messageId}`,
      sessionId,
      messageId,
      content: content.substring(0, 1000),
      embedding,
      timestamp: new Date().toISOString(),
      role,
    };

    try {
      const table = await db.openTable(tableName);
      await table.add([record]);
    } catch (err) {
      console.error('[LanceDB] Error adding embedding:', err);
    }
  }

  async searchSimilar(
    sessionId: string,
    query: string,
    limit: number = 5
  ): Promise<EmbeddingRecord[]> {
    const db = await this.getDB();
    const tableName = `session_${sessionId.replace(/-/g, '_')}`;

    try {
      const table = await db.openTable(tableName);
      const queryEmbedding = await this.generateEmbedding(query);

      const results = await table
        .search(queryEmbedding)
        .limit(limit)
        .execute();

      return results as EmbeddingRecord[];
    } catch (err) {
      console.error('[LanceDB] Error searching:', err);
      return [];
    }
  }

  async deleteTable(sessionId: string): Promise<void> {
    const db = await this.getDB();
    const tableName = `session_${sessionId.replace(/-/g, '_')}`;

    try {
      await db.dropTable(tableName);
    } catch (err) {
      console.error('[LanceDB] Error deleting table:', err);
    }
  }
}
