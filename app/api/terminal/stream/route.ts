export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

type CliType = 'claude' | 'gemini' | 'copilot' | 'codex';

const ALLOWED_CLI_TYPES = new Set<CliType>(['claude', 'gemini', 'copilot', 'codex']);

function getCliArgs(cli: CliType, prompt: string): { cmd: string; args: string[] } {
    switch (cli) {
        case 'claude':
            return { cmd: 'claude', args: ['--print', prompt] };
        case 'gemini':
            return { cmd: 'gemini', args: ['-p', prompt] };
        case 'copilot':
            return { cmd: 'gh', args: ['copilot', 'suggest', '-t', 'shell', prompt] };
        case 'codex':
            return { cmd: 'codex', args: [prompt] };
    }
}

export async function POST(req: NextRequest) {
    let body: { cli?: unknown; prompt?: unknown; cwd?: unknown };
    try {
        body = await req.json();
    } catch {
        return new Response('Invalid JSON', { status: 400 });
    }

    const { cli, prompt, cwd } = body;

    if (typeof cli !== 'string' || !ALLOWED_CLI_TYPES.has(cli as CliType)) {
        return new Response('Invalid or missing cli', { status: 400 });
    }

    if (typeof prompt !== 'string' || !prompt.trim()) {
        return new Response('Invalid or missing prompt', { status: 400 });
    }

    // Validate and sanitize cwd — only allow an existing directory path
    const resolvedCwd =
        typeof cwd === 'string' && cwd.trim() && existsSync(cwd.trim())
            ? cwd.trim()
            : process.cwd();

    const { cmd, args } = getCliArgs(cli as CliType, prompt.trim());

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let proc: ReturnType<typeof spawn>;
            try {
                proc = spawn(cmd, args, {
                    cwd: resolvedCwd,
                    env: process.env,
                    shell: true,
                    stdio: ['ignore', 'pipe', 'pipe'],
                });
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'stderr', data: `Falha ao iniciar ${cmd}: ${msg}` })}\n\n`)
                );
                controller.close();
                return;
            }

            const send = (type: 'stdout' | 'stderr' | 'exit', data: string) => {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
                    );
                } catch {
                    // stream already closed
                }
            };

            proc.stdout?.on('data', (chunk: Buffer) => send('stdout', chunk.toString('utf8')));
            proc.stderr?.on('data', (chunk: Buffer) => send('stderr', chunk.toString('utf8')));

            proc.on('close', (code: number | null) => {
                send('exit', `Processo finalizado com código ${code ?? '?'}`);
                controller.close();
            });

            proc.on('error', (err: Error) => {
                send('stderr', `Erro: ${err.message}`);
                controller.close();
            });
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
