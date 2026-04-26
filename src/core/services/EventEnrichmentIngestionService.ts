import type { MemoryEntry } from '../../memory';
import { memoryManager } from '../../memory';
import { Logger } from '../utils/Logger';
import { EventEnrichmentService } from './EventEnrichmentService';

interface Enricher {
    enrichBatch(entries: MemoryEntry[], options?: { persist?: boolean }): Promise<unknown>;
}

type SignalLevel = 'critical' | 'high' | 'normal' | 'trivial';

interface QueuedEvent {
    entry: MemoryEntry;
    signal: SignalLevel;
    priority: number;
    insertedAt: number;
}

export interface EventEnrichmentIngestionOptions {
    batchSize?: number;
    flushIntervalMs?: number;
    persistEnrichment?: boolean;
    minSignalForEnrichment?: SignalLevel;
}

export class EventEnrichmentIngestionService {
    private readonly logger = Logger.getInstance('EventEnrichmentIngestionService');
    private readonly batchSize: number;
    private readonly flushIntervalMs: number;
    private readonly persistEnrichment: boolean;
    private readonly minSignalForEnrichment: SignalLevel;

    private pending: QueuedEvent[] = [];
    private flushTimer: ReturnType<typeof setTimeout> | null = null;
    private flushing = false;

    constructor(
        private readonly enricher: Enricher = new EventEnrichmentService(),
        options: EventEnrichmentIngestionOptions = {},
    ) {
        this.batchSize = Math.max(1, options.batchSize ?? 5);
        this.flushIntervalMs = Math.max(100, options.flushIntervalMs ?? 2_000);
        this.persistEnrichment = options.persistEnrichment ?? true;
        this.minSignalForEnrichment = options.minSignalForEnrichment ?? 'high';
    }

    async ingest(entry: MemoryEntry): Promise<void> {
        await memoryManager.log(entry);
        const queued = this.toQueuedEvent(entry);
        this.pending.push(queued);
        this.pending.sort((a, b) => {
            if (a.priority === b.priority) {
                return a.insertedAt - b.insertedAt;
            }
            return b.priority - a.priority;
        });

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
        const toEnrich = batch
            .filter((item) => this.meetsSignalThreshold(item.signal))
            .map((item) => item.entry);

        try {
            if (toEnrich.length > 0) {
                await this.enricher.enrichBatch(toEnrich, { persist: this.persistEnrichment });
            }
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

    private toQueuedEvent(entry: MemoryEntry): QueuedEvent {
        const signal = this.classifySignal(entry);
        return {
            entry,
            signal,
            priority: this.signalToPriority(signal),
            insertedAt: Date.now(),
        };
    }

    private classifySignal(entry: MemoryEntry): SignalLevel {
        const content = entry.content.toLowerCase();

        const criticalPatterns = [
            /\b(5\d\d|panic|fatal|segmentation fault|data loss|unauthorized|forbidden)\b/u,
            /\b(exception|crash|out of memory)\b/u,
        ];
        if (criticalPatterns.some((pattern) => pattern.test(content))) {
            return 'critical';
        }

        const highPatterns = [
            /\b(error|failed|failure|timeout|denied|refused|rollback)\b/u,
            /\bsecurity|auth|permission|policy\b/u,
        ];
        if (highPatterns.some((pattern) => pattern.test(content))) {
            return 'high';
        }

        const trivialPatterns = [
            /\b(heartbeat|keepalive|noop|ok)\b/u,
            /processo finalizado com c[oó]digo 0/u,
        ];
        if (trivialPatterns.some((pattern) => pattern.test(content))) {
            return 'trivial';
        }

        return 'normal';
    }

    private signalToPriority(signal: SignalLevel): number {
        switch (signal) {
            case 'critical':
                return 100;
            case 'high':
                return 75;
            case 'normal':
                return 50;
            case 'trivial':
                return 10;
        }
    }

    private meetsSignalThreshold(signal: SignalLevel): boolean {
        const rank: Record<SignalLevel, number> = {
            critical: 4,
            high: 3,
            normal: 2,
            trivial: 1,
        };
        return rank[signal] >= rank[this.minSignalForEnrichment];
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
