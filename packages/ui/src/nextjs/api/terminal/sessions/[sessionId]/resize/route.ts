export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { sessions } from '../../../_sessions';

type Params = { params: Promise<{ sessionId: string }> };

/** POST { cols, rows } — resize the underlying PTY so TUIs render at the correct size */
export async function POST(req: NextRequest, { params }: Params) {
    const { sessionId } = await params;
    const session = sessions.get(sessionId);

    if (!session) return new Response('Session not found', { status: 404 });
    if (session.exited) return new Response('Process has exited', { status: 410 });

    let body: { cols?: unknown; rows?: unknown };
    try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

    const cols = Number(body.cols);
    const rows = Number(body.rows);
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols < 1 || rows < 1 || cols > 1000 || rows > 1000) {
        return new Response('Invalid cols/rows', { status: 400 });
    }

    try {
        session.proc.resize(Math.floor(cols), Math.floor(rows));
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(null, { status: 204 });
}
