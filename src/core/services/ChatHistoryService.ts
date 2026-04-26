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
  search?: string;
  channel?: string;
  dateFilter?: string;
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
    options: { limit: number; offset: number; search?: string; channel?: string; dateFilter?: string }
  ): Promise<{ items: ChatHistory[]; total: number }> {
    const repo = this.db.getRepository(ChatHistory);
    
    // Build query conditions
    const queryBuilder = repo.createQueryBuilder('chat')
      .orderBy('chat.createdAt', 'DESC')
      .take(options.limit)
      .skip(options.offset);

    // Add search filter
    if (options.search) {
      queryBuilder.andWhere(
        '(chat.message ILIKE :search OR chat.channelId ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    // Add channel filter
    if (options.channel) {
      queryBuilder.andWhere('chat.channelId = :channel', { channel: options.channel });
    }

    // Add date filter
    if (options.dateFilter) {
      const now = new Date();
      let startDate: Date;

      switch (options.dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }

      queryBuilder.andWhere('chat.createdAt >= :startDate', { startDate });
    }

    const [items, total] = await queryBuilder.getManyAndCount();
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
