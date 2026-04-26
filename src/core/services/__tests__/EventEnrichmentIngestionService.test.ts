import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeEntry(id: string) {
    return {
        id,
        content: `event-${id}`,
        source: 'test-observer',
        projectId: 'project-a',
        timestamp: new Date('2026-04-26T10:00:00.000Z'),
    };
}

describe.sequential('EventEnrichmentIngestionService', () => {
    const originalCwd = process.cwd();
    let tempRoot = '';

    beforeEach(async () => {
        tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kairos-enrichment-ingestion-'));
        process.chdir(tempRoot);
        vi.useFakeTimers();
        vi.resetModules();
    });

    afterEach(async () => {
        vi.useRealTimers();
        process.chdir(originalCwd);
        if (tempRoot) {
            await fs.rm(tempRoot, { recursive: true, force: true });
        }
    });

    it('flushes immediately when batch size is reached', async () => {
        const fakeEnricher = { enrichBatch: vi.fn().mockResolvedValue([]) };
        const { EventEnrichmentIngestionService } = await import('../EventEnrichmentIngestionService');

        const ingestion = new EventEnrichmentIngestionService(fakeEnricher as any, {
            batchSize: 2,
            flushIntervalMs: 5000,
        });

        await ingestion.ingest(makeEntry('evt-1'));
        expect(fakeEnricher.enrichBatch).toHaveBeenCalledTimes(0);

        await ingestion.ingest(makeEntry('evt-2'));

        expect(fakeEnricher.enrichBatch).toHaveBeenCalledTimes(1);
        const [batchArg, optionsArg] = fakeEnricher.enrichBatch.mock.calls[0];
        expect(batchArg).toHaveLength(2);
        expect(optionsArg).toEqual({ persist: true });
    });

    it('flushes pending entries when timer elapses', async () => {
        const fakeEnricher = { enrichBatch: vi.fn().mockResolvedValue([]) };
        const { EventEnrichmentIngestionService } = await import('../EventEnrichmentIngestionService');

        const ingestion = new EventEnrichmentIngestionService(fakeEnricher as any, {
            batchSize: 5,
            flushIntervalMs: 100,
        });

        await ingestion.ingest(makeEntry('evt-3'));
        expect(ingestion.getPendingCount()).toBe(1);

        await vi.advanceTimersByTimeAsync(120);

        expect(fakeEnricher.enrichBatch).toHaveBeenCalledTimes(1);
        expect(ingestion.getPendingCount()).toBe(0);
    });

    it('writes raw append-only logs while queueing for enrichment', async () => {
        const fakeEnricher = { enrichBatch: vi.fn().mockResolvedValue([]) };
        const { EventEnrichmentIngestionService } = await import('../EventEnrichmentIngestionService');

        const ingestion = new EventEnrichmentIngestionService(fakeEnricher as any, {
            batchSize: 10,
            flushIntervalMs: 5_000,
        });

        await ingestion.ingest(makeEntry('evt-4'));

        const logFile = path.join(process.cwd(), 'data', 'logs', '2026-04-26.log');
        const content = await fs.readFile(logFile, 'utf8');
        expect(content).toContain('"id":"evt-4"');

        await ingestion.stop();
        expect(fakeEnricher.enrichBatch).toHaveBeenCalledTimes(1);
    });
});
