import { describe, expect, it, vi } from 'vitest';
import { ContextBuilder } from '../contextBuilder';

describe('ContextBuilder', () => {
    it('keeps heuristic retrieval then applies semantic rerank with reason', async () => {
        const fakeRetriever = {
            retrieve: vi.fn().mockResolvedValue([
                {
                    id: '1',
                    key: 'deploy issue',
                    value: 'timeout while deploying',
                    category: 'ops',
                    priority: 9,
                    projectId: 'p1',
                    score: 0.9,
                },
                {
                    id: '2',
                    key: 'readme update',
                    value: 'documentation tweaks',
                    category: 'docs',
                    priority: 5,
                    projectId: 'p1',
                    score: 0.5,
                },
            ]),
        };

        const fakeReranker = {
            rerank: vi.fn().mockImplementation(async (items) => [
                {
                    ...items[1],
                    rank: 1,
                    finalScore: 2.0,
                    reason: 'Query asks for documentation context',
                },
                {
                    ...items[0],
                    rank: 2,
                    finalScore: 1.0,
                    reason: 'Operational issue is secondary to docs request',
                },
            ]),
        };

        const builder = new ContextBuilder({} as any, {
            retriever: fakeRetriever as any,
            semanticReranker: fakeReranker as any,
        });

        const window = await builder.build('p1', 'documentation update', 2000);

        expect(fakeRetriever.retrieve).toHaveBeenCalledWith('p1', 'documentation update', 50);
        expect(fakeReranker.rerank).toHaveBeenCalledTimes(1);
        expect(window.items[0].key).toBe('readme update');
        expect(window.items[0].reason).toContain('documentation');
    });
});
