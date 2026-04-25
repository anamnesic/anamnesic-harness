export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';

const HEARTBEAT_MS = 15_000;
const RUNS_POLL_MS = 2_000;

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();
    const signal = req.signal;

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let closed = false;
            const send = (event: string, data: unknown) => {
                if (closed) return;
                try {
                    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(payload));
                } catch {
                    // Stream already closed
                }
            };
            const sendRaw = (chunk: string) => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(chunk));
                } catch {
                    // Stream already closed
                }
            };

            // Subscribe to in-process EventBus and forward all events. Failure
            // here is non-fatal — we still have the polling fallback below.
            let unsubscribe: (() => void) | null = null;
            try {
                const { getEventBus } = await import('@/src/observation/EventBus');
                const bus = getEventBus('default');
                const originalEmit = (bus as any).emit?.bind(bus);
                if (typeof originalEmit === 'function' && typeof (bus as any).on === 'function') {
                    // Wrap emit to forward every event type as it happens.
                    (bus as any).emit = async (eventType: string, data?: unknown) => {
                        send(eventType, { type: eventType, data, timestamp: new Date().toISOString() });
                        return originalEmit(eventType, data);
                    };
                    unsubscribe = () => {
                        (bus as any).emit = originalEmit;
                    };
                }
            } catch {
                // EventBus unavailable — continue with polling-only mode.
            }

            // Initial hello so the client transitions to "open" immediately.
            send('hello', { ok: true, ts: new Date().toISOString() });

            // Periodic snapshot of orchestrator runs from DB.
            const pollRuns = async () => {
                if (closed) return;
                try {
                    const db = await getDb();
                    const { OrchestratorRunRecord } = await import('@/src/core/entities/OrchestratorRun');
                    const repo = db.getRepository(OrchestratorRunRecord);
                    const rows = await repo.find({
                        where: [{ status: 'running' }, { status: 'paused' }],
                        order: { updatedAt: 'DESC' },
                        take: 100,
                    });
                    send('runs.snapshot', {
                        runs: rows,
                        count: rows.length,
                        timestamp: new Date().toISOString(),
                    });
                } catch {
                    // Swallow — DB may not be ready yet.
                }
            };

            const heartbeat = setInterval(() => sendRaw(`: ping\n\n`), HEARTBEAT_MS);
            const runsTimer = setInterval(pollRuns, RUNS_POLL_MS);

            // Fire one immediately so clients populate without waiting 2s.
            void pollRuns();

            const cleanup = () => {
                if (closed) return;
                closed = true;
                clearInterval(heartbeat);
                clearInterval(runsTimer);
                if (unsubscribe) {
                    try { unsubscribe(); } catch { /* ignore */ }
                }
                try { controller.close(); } catch { /* ignore */ }
            };

            if (signal.aborted) {
                cleanup();
                return;
            }
            signal.addEventListener('abort', cleanup);
        },
    });

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
