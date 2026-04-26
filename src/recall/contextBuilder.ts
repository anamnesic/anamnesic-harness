import { DataSource } from 'typeorm';
import { Retriever } from './retriever';
import { rank, type RankedItem } from './ranking';
import { SemanticRerankService } from './SemanticRerankService';
import { Logger } from '../core/utils/Logger';

export interface ContextWindow {
    projectId: string;
    query: string;
    items: Array<{
        rank: number;
        key: string;
        value: string;
        category: string;
        score: number;
        reason?: string;
    }>;
    tokenEstimate: number;
    builtAt: Date;
}

interface RetrieverLike {
    retrieve(projectId: string, query: string, limit?: number): Promise<Array<{
        id: string;
        key: string;
        value: string;
        category: string;
        priority: number;
        projectId: string;
        score: number;
    }>>;
}

interface RerankerLike {
    rerank(items: RankedItem[], query: string, options?: { topN?: number }): Promise<RankedItem[]>;
}

const AVG_CHARS_PER_TOKEN = 4;

/**
 * ContextBuilder
 *
 * Builds a ranked context window for a given project + query,
 * trimmed to a token budget.
 */
export class ContextBuilder {
    private retriever: RetrieverLike;
    private semanticReranker: RerankerLike;
    private logger = Logger.getInstance('ContextBuilder');

    constructor(private db: DataSource, deps?: { retriever?: RetrieverLike; semanticReranker?: RerankerLike }) {
        this.retriever = deps?.retriever ?? new Retriever(db);
        this.semanticReranker = deps?.semanticReranker ?? new SemanticRerankService();
    }

    async build(projectId: string, query: string, tokenBudget = 2000): Promise<ContextWindow> {
        // Keep fast lexical retrieval as stage 1 for low-cost recall.
        const raw = await this.retriever.retrieve(projectId, query, 50);
        const heuristicallyRanked = rank(raw, query);
        const ranked = await this.semanticReranker.rerank(heuristicallyRanked, query, { topN: 12 });

        const items: ContextWindow['items'] = [];
        let chars = 0;
        const budgetChars = tokenBudget * AVG_CHARS_PER_TOKEN;

        for (const item of ranked) {
            const entryChars = item.key.length + item.value.length + 4;
            if (chars + entryChars > budgetChars) break;
            items.push({
                rank: item.rank,
                key: item.key,
                value: item.value,
                category: item.category,
                score: item.finalScore,
                reason: item.reason,
            });
            chars += entryChars;
        }

        this.logger.info(`ContextBuilder built window: ${items.length} items, ~${Math.round(chars / AVG_CHARS_PER_TOKEN)} tokens`);

        return {
            projectId,
            query,
            items,
            tokenEstimate: Math.round(chars / AVG_CHARS_PER_TOKEN),
            builtAt: new Date(),
        };
    }
}
