export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { spawn } from 'node-pty';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { sessions, broadcast, type Session } from '../_sessions';

type CliType = 'claude' | 'gemini' | 'copilot' | 'codex';
type CliCommand = { cmd: string; args: string[] };
type SpawnCommand = { file: string; args: string[] };

const ALLOWED: Set<CliType> = new Set(['claude', 'gemini', 'copilot', 'codex']);

function commandExists(cmd: string): boolean {
    const checker = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(checker, [cmd], { stdio: 'ignore' });
    return result.status === 0;
}

function firstAvailable(candidates: string[]): string {
    for (const cmd of candidates) {
        if (commandExists(cmd)) return cmd;
    }
    return candidates[0];
}

function getCliCommand(cli: CliType): CliCommand {
    switch (cli) {
        case 'claude': return { cmd: firstAvailable(['claude', 'claude-code', 'claude-ai']), args: [] };
        case 'gemini': return { cmd: firstAvailable(['gemini', 'gemini-cli']), args: [] };
        // Newer copilot CLIs don't support `-t shell`; keep a plain interactive command.
        case 'copilot':
            if (commandExists('copilot')) return { cmd: 'copilot', args: [] };
            return { cmd: 'gh', args: ['copilot'] };
        case 'codex': return { cmd: 'codex', args: [] };
    }
}

function quoteForCmd(value: string): string {
    if (!/[\s"]/u.test(value)) return value;
    return `"${value.replace(/"/g, '""')}"`;
}

function getSpawnCommand(cli: CliType): SpawnCommand {
    const { cmd, args } = getCliCommand(cli);
    if (process.platform !== 'win32') {
        return { file: cmd, args };
    }

    const comspec = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
    const commandLine = [cmd, ...args].map(quoteForCmd).join(' ');
    return {
        file: comspec,
        args: ['/d', '/c', commandLine],
    };
}

export async function POST(req: NextRequest) {
    let body: { cli?: unknown; cwd?: unknown };
    try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

    const { cli, cwd } = body;
    if (typeof cli !== 'string' || !ALLOWED.has(cli as CliType)) {
        return new Response('Invalid cli', { status: 400 });
    }

    const resolvedCwd =
        typeof cwd === 'string' && cwd.trim() && existsSync(cwd.trim())
            ? cwd.trim()
            : process.cwd();

    const { file, args } = getSpawnCommand(cli as CliType);
    const sessionId = randomUUID();

    let proc: ReturnType<typeof spawn>;
    try {
        proc = spawn(file, args, {
            name: process.platform === 'win32' ? 'xterm-color' : 'xterm-256color',
            cwd: resolvedCwd,
            cols: 120,
            rows: 30,
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
