export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { spawn } from 'node-pty';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { sessions, broadcast, type Session } from '../_sessions';
import { llmCliRegistry } from '@/src/core/llm-cli';
import type { LlmCliProvider } from '@/src/core/llm-cli';

type CliType = LlmCliProvider | 'shell';

const ALLOWED: Set<CliType> = new Set(['claude', 'gemini', 'copilot', 'codex', 'opencode', 'shell']);

function getShellSpawn(): { file: string; args: string[] } {
    if (process.platform === 'win32') {
        const file = process.env.COMSPEC || 'powershell.exe';
        return { file, args: [] };
    }
    const file = process.env.SHELL || '/bin/bash';
    // -i = interactive (loads aliases, prompt, etc.) — comporta-se como o terminal real
    return { file, args: ['-i'] };
}

export async function POST(req: NextRequest) {
    let body: { cli?: unknown; cwd?: unknown; cols?: unknown; rows?: unknown };
    try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

    const { cli, cwd } = body;
    if (typeof cli !== 'string' || !ALLOWED.has(cli as CliType)) {
        return new Response('Invalid cli', { status: 400 });
    }

    const colsRaw = Number(body.cols);
    const rowsRaw = Number(body.rows);
    const cols = Number.isFinite(colsRaw) && colsRaw >= 20 && colsRaw <= 1000 ? Math.floor(colsRaw) : 120;
    const rows = Number.isFinite(rowsRaw) && rowsRaw >= 5 && rowsRaw <= 1000 ? Math.floor(rowsRaw) : 30;

    const resolvedCwd =
        typeof cwd === 'string' && cwd.trim() && existsSync(cwd.trim())
            ? cwd.trim()
            : process.cwd();

    const { file, args } =
        cli === 'shell'
            ? getShellSpawn()
            : llmCliRegistry.get(cli as LlmCliProvider).getSpawnCommand('interactive');
    const sessionId = randomUUID();

    let proc: ReturnType<typeof spawn>;
    try {
        proc = spawn(file, args, {
            name: process.platform === 'win32' ? 'xterm-color' : 'xterm-256color',
            cwd: resolvedCwd,
            cols,
            rows,
            env: {
                ...process.env,
                TERM: process.env.TERM || 'xterm-256color',
                COLORTERM: process.env.COLORTERM || 'truecolor',
            },
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Failed to spawn ${file}: ${msg}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const session: Session = {
        proc,
        cli,
        cwd: resolvedCwd,
        buffer: [],
        controllers: new Set(),
        exited: false,
        exitCode: null,
    };

    sessions.set(sessionId, session);

    // Initial info line
    broadcast(session, `\x1b[2m[${cli} started in ${resolvedCwd}]\x1b[0m\n`);

    proc.onData((data: string) => broadcast(session, data));

    proc.onExit(({ exitCode }) => {
        session.exited = true;
        session.exitCode = exitCode;
        broadcast(session, `\x1b[2m[process exited with code ${exitCode}]\x1b[0m\n`);
        // Close all SSE streams
        for (const ctrl of session.controllers) {
            try { ctrl.close(); } catch { /* already closed */ }
        }
        session.controllers.clear();
        // Clean up after 5 min
        setTimeout(() => sessions.delete(sessionId), 5 * 60 * 1000);
    });

    return new Response(JSON.stringify({ sessionId, cli, cwd: resolvedCwd }), {
        headers: { 'Content-Type': 'application/json' },
    });
}
