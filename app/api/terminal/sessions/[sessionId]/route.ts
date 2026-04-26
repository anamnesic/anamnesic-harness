export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { sessions, broadcast } from '../../_sessions';

type Params = { params: Promise<{ sessionId: string }> };

/** GET — subscribe to session output via SSE */
export async function GET(_req: NextRequest, { params }: Params) {
    const { sessionId } = await params;
    const session = sessions.get(sessionId);

    if (!session) {
        return new Response('Session not found', { status: 404 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            if (session.exited) {
                // Replay buffer then close
                for (const line of session.buffer) {
                    try {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: line })}\n\n`));
                    } catch { /* closed */ }
                }
                controller.close();
                return;
            }

            // Send buffered history first
            for (const line of session.buffer) {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: line })}\n\n`));
                } catch { /* closed */ }
            }

            session.controllers.add(controller);
        },
        cancel() {
            // Unsubscribe when client disconnects
            const s = sessions.get(sessionId);
            if (s) s.controllers.delete(this as unknown as ReadableStreamDefaultController<Uint8Array>);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

/** DELETE — kill the process */
export async function DELETE(_req: NextRequest, { params }: Params) {
    const { sessionId } = await params;
    const session = sessions.get(sessionId);

    if (!session) return new Response('Not found', { status: 404 });

    if (!session.exited) {
        broadcast(session, '\x1b[2m[session terminated by user]\x1b[0m\n');
        try { session.proc.kill(); } catch { /* already dead */ }
    }

    sessions.delete(sessionId);
    return new Response(null, { status: 204 });
}
