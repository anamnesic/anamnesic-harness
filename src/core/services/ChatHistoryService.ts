import { DataSource } from 'typeorm';
import { ChatHistory } from '../entities/ChatHistory';

export interface SaveHistoryInput {
  channelId: string;
  message: string;
  sender?: string;
  metadata?: Record<string, any> | null;
}

export interface HistoryFilter {
  limit?: number;
  offset?: number;
}

export interface BackupInfo {
  id: string;
  createdAt: Date;
  size: number;
}

export interface RecoveryResult {
  success: boolean;
  message: string;
}

export class ChatHistoryService {
  constructor(private db: DataSource) { }

  async saveHistory(input: SaveHistoryInput): Promise<void> {
    const repo = this.db.getRepository(ChatHistory);
    const entry = repo.create({
      channelId: input.channelId,
      message: input.message,
      sender: input.sender ?? 'user',
      metadata: input.metadata ?? null,
    });
    await repo.save(entry);
  }

  async getHistory(filter?: HistoryFilter): Promise<ChatHistory[]> {
    const repo = this.db.getRepository(ChatHistory);
    return repo.find({
      order: { createdAt: 'DESC' },
      take: filter?.limit,
      skip: filter?.offset,
    });
  }

  async getHistoryPaginated(
    options: { limit: number; offset: number }
  ): Promise<{ items: ChatHistory[]; total: number }> {
    const repo = this.db.getRepository(ChatHistory);
    const [items, total] = await repo.findAndCount({
      order: { createdAt: 'DESC' },
      take: options.limit,
      skip: options.offset,
    });
    return { items, total };
  }

  async deleteEntry(id: string): Promise<void> {
    const repo = this.db.getRepository(ChatHistory);
    const entry = await repo.findOneBy({ id });
    if (!entry) {
      throw new Error(`ChatHistory entry not found: ${id}`);
    }
    await repo.remove(entry);
  }

  async backup(): Promise<BackupInfo> {
    return { id: 'stub', createdAt: new Date(), size: 0 };
  }

  async recover(): Promise<RecoveryResult> {
    return { success: true, message: 'Stub' };
  }
}
