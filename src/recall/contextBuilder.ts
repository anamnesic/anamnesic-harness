import { DataSource } from 'typeorm';
import { Retriever } from './retriever';
import { rank } from './ranking';
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
    }>;
    tokenEstimate: number;
    builtAt: Date;
}

const AVG_CHARS_PER_TOKEN = 4;

/**
 * ContextBuilder
 *
 * Builds a ranked context window for a given project + query,
 * trimmed to a token budget.
 */
export class ContextBuilder {
    private retriever: Retriever;
    private logger = Logger.getInstance('ContextBuilder');

    constructor(private db: DataSource) {
        this.retriever = new Retriever(db);
    }

    async build(projectId: string, query: string, tokenBudget = 2000): Promise<ContextWindow> {
        const raw = await this.retriever.retrieve(projectId, query, 50);
        const ranked = rank(raw, query);

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
