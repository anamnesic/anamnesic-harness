export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { sessions, broadcast, type Session } from '../_sessions';

type CliType = 'claude' | 'gemini' | 'copilot' | 'codex';
type CliCommand = { cmd: string; args: string[]; shell?: boolean };

const ALLOWED: Set<CliType> = new Set(['claude', 'gemini', 'copilot', 'codex']);

function getCliCommand(cli: CliType): CliCommand {
    switch (cli) {
        case 'claude': return { cmd: 'claude', args: [] };
        case 'gemini': {
            // Gemini exits if started without prompt/stdin. Keep a long-lived wrapper
            // that converts each incoming line into: gemini --prompt "...".
            const wrapper = [
                "const { createInterface } = require('node:readline');",
                "const { spawn } = require('node:child_process');",
                "const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });",
                "async function runPrompt(line){",
                "  await new Promise((resolve) => {",
                "    const p = spawn('gemini', ['--prompt', line], { shell: true, stdio: ['ignore','pipe','pipe'] });",
                "    p.stdout.on('data', (d) => process.stdout.write(d));",
                "    p.stderr.on('data', (d) => process.stderr.write(d));",
                "    p.on('close', () => resolve());",
                "  });",
                "}",
                "(async () => {",
                "  for await (const raw of rl) {",
                "    const line = String(raw).trim();",
                "    if (!line) continue;",
                "    await runPrompt(line);",
                "  }",
                "})().catch((e) => {",
                "  console.error(e?.message ?? String(e));",
                "  process.exit(1);",
                "});",
            ].join(' ');
            return { cmd: 'node', args: ['-e', wrapper], shell: false };
        }
        // Newer copilot CLIs don't support `-t shell`; keep a plain interactive command.
        case 'copilot': return { cmd: 'copilot', args: [] };
        case 'codex': return { cmd: 'codex', args: [] };
    }
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

    const { cmd, args, shell } = getCliCommand(cli as CliType);
    const sessionId = randomUUID();

    let proc: ReturnType<typeof spawn>;
    try {
        proc = spawn(cmd, args, {
            cwd: resolvedCwd,
            env: {
                ...process.env,
                TERM: process.env.TERM || 'xterm-256color',
                COLORTERM: process.env.COLORTERM || 'truecolor',
            },
            shell: shell ?? true,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Failed to spawn ${cmd}: ${msg}` }), {
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

    proc.stdout?.on('data', (chunk: Buffer) => broadcast(session, chunk.toString('utf8')));
    proc.stderr?.on('data', (chunk: Buffer) => broadcast(session, chunk.toString('utf8')));

    proc.on('close', (code: number | null) => {
        session.exited = true;
        session.exitCode = code;
        broadcast(session, `\x1b[2m[process exited with code ${code ?? '?'}]\x1b[0m\n`);
        // Close all SSE streams
        for (const ctrl of session.controllers) {
            try { ctrl.close(); } catch { /* already closed */ }
        }
        session.controllers.clear();
        // Clean up after 5 min
        setTimeout(() => sessions.delete(sessionId), 5 * 60 * 1000);
    });

    proc.on('error', (err: Error) => {
        broadcast(session, `\x1b[31m[error: ${err.message}]\x1b[0m\n`);
    });

    return new Response(JSON.stringify({ sessionId, cli, cwd: resolvedCwd }), {
        headers: { 'Content-Type': 'application/json' },
    });
}
