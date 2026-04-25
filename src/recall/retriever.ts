import { DataSource } from 'typeorm';
import { ContextEntry } from '../core/entities/ContextEntry';
import { Logger } from '../core/utils/Logger';

export interface RetrievedItem {
    id: string;
    key: string;
    value: string;
    category: string;
    priority: number;
    projectId: string;
    score: number;
}

/**
 * Retriever
 *
 * Retrieves relevant context entries from the database
 * using keyword search and priority ordering.
 */
export class Retriever {
    private repo;
    private logger = Logger.getInstance('Retriever');

    constructor(private db: DataSource) {
        this.repo = db.getRepository(ContextEntry);
    }

    async retrieve(projectId: string, query: string, limit = 20): Promise<RetrievedItem[]> {
        const rows = await this.repo
            .createQueryBuilder('ctx')
            .where('ctx.projectId = :projectId', { projectId })
            .andWhere('(ctx.key LIKE :q OR ctx.value LIKE :q)', { q: `%${query}%` })
            .orderBy('ctx.priority', 'DESC')
            .limit(limit)
            .getMany();

        return rows.map((r) => ({
            id: r.id,
            key: r.key,
            value: r.value,
            category: r.category,
            priority: r.priority,
            projectId: (r as any).projectId ?? projectId,
            score: r.priority / 10,
        }));
    }

    async retrieveByCategory(projectId: string, category: string, limit = 10): Promise<RetrievedItem[]> {
        const rows = await this.repo.find({
            where: { category, project: { id: projectId } } as any,
            order: { priority: 'DESC' },
            take: limit,
        });

        return rows.map((r) => ({
            id: r.id,
            key: r.key,
            value: r.value,
            category: r.category,
            priority: r.priority,
            projectId,
            score: r.priority / 10,
        }));
    }
}
