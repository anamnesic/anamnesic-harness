import type { ChildProcess } from 'node:child_process';

export interface Session {
    proc: ChildProcess;
    cli: string;
    cwd: string;
    /** Buffered output so late subscribers get recent history */
    buffer: string[];
    /** Active SSE controllers listening to this session */
    controllers: Set<ReadableStreamDefaultController<Uint8Array>>;
    exited: boolean;
    exitCode: number | null;
}

// Use a global to survive Next.js hot-reload in development
declare global {
    // eslint-disable-next-line no-var
    var __kairosSessions: Map<string, Session> | undefined;
}

export const sessions: Map<string, Session> =
    globalThis.__kairosSessions ?? (globalThis.__kairosSessions = new Map());

const BUFFER_MAX = 500; // keep last N lines of output per session

export function broadcast(session: Session, data: string) {
    session.buffer.push(data);
    if (session.buffer.length > BUFFER_MAX) {
        session.buffer.splice(0, session.buffer.length - BUFFER_MAX);
    }
    const encoded = new TextEncoder().encode(`data: ${JSON.stringify({ text: data })}\n\n`);
    for (const ctrl of session.controllers) {
        try { ctrl.enqueue(encoded); } catch { /* closed */ }
    }
}
