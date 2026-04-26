import type { MemoryEntry } from '../../memory';
import { memoryManager } from '../../memory';
import { Logger } from '../utils/Logger';
import { EventEnrichmentService } from './EventEnrichmentService';

interface Enricher {
    enrichBatch(entries: MemoryEntry[], options?: { persist?: boolean }): Promise<unknown>;
}

export interface EventEnrichmentIngestionOptions {
    batchSize?: number;
    flushIntervalMs?: number;
    persistEnrichment?: boolean;
}

export class EventEnrichmentIngestionService {
    private readonly logger = Logger.getInstance('EventEnrichmentIngestionService');
    private readonly batchSize: number;
    private readonly flushIntervalMs: number;
    private readonly persistEnrichment: boolean;

    private pending: MemoryEntry[] = [];
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private flushing = false;

    constructor(
        private readonly enricher: Enricher = new EventEnrichmentService(),
        options: EventEnrichmentIngestionOptions = {},
    ) {
        this.batchSize = Math.max(1, options.batchSize ?? 5);
        this.flushIntervalMs = Math.max(100, options.flushIntervalMs ?? 2_000);
        this.persistEnrichment = options.persistEnrichment ?? true;
    }

    async ingest(entry: MemoryEntry): Promise<void> {
        await memoryManager.log(entry);
        this.pending.push(entry);

        if (this.pending.length >= this.batchSize) {
            this.clearTimer();
            await this.flush();
            return;
        }

        this.ensureTimer();
    }

    async flush(): Promise<void> {
        if (this.flushing) return;
        if (!this.pending.length) return;

        this.flushing = true;
        const batch = this.pending.splice(0, this.batchSize);

        try {
            await this.enricher.enrichBatch(batch, { persist: this.persistEnrichment });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Batch enrichment failed: ${message}`);
        } finally {
            this.flushing = false;
        }

        if (this.pending.length > 0) {
            this.ensureTimer();
        }
    }

    async stop(): Promise<void> {
        this.clearTimer();
        while (this.pending.length > 0) {
            await this.flush();
        }
    }

    getPendingCount(): number {
        return this.pending.length;
    }

    private ensureTimer(): void {
        if (this.flushTimer) return;

        this.flushTimer = setTimeout(async () => {
            this.flushTimer = null;
            await this.flush();
        }, this.flushIntervalMs);
    }

    private clearTimer(): void {
        if (!this.flushTimer) return;
        clearTimeout(this.flushTimer);
        this.flushTimer = null;
    }
}
