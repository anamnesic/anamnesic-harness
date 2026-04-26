export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { sessions } from '../../../_sessions';

type Params = { params: Promise<{ sessionId: string }> };

/** POST — write data to the process stdin */
export async function POST(req: NextRequest, { params }: Params) {
    const { sessionId } = await params;
    const session = sessions.get(sessionId);

    if (!session) return new Response('Session not found', { status: 404 });
    if (session.exited) return new Response('Process has exited', { status: 410 });

    let body: { data?: unknown };
    try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

    const data = typeof body.data === 'string' ? body.data : null;
    if (data === null) return new Response('Missing data', { status: 400 });

    try {
        session.proc.stdin?.write(data);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(null, { status: 204 });
}
