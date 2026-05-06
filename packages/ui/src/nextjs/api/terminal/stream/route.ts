export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { CliInferenceService } from '@/src/core/llm-cli';
import type { LlmCliProvider } from '@/src/core/llm-cli';

type CliType = LlmCliProvider;

const ALLOWED_CLI_TYPES = new Set<CliType>(['kairos', 'gemini', 'copilot', 'codex', 'kairos']);

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

    const inference = new CliInferenceService();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (type: 'stdout' | 'stderr' | 'exit', data: string) => {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
                    );
                } catch {
                    // stream already closed
                }
            };

            try {
                const result = await inference.streamPrompt(
                    {
                        preferredProvider: cli as CliType,
                        prompt: prompt.trim(),
                        cwd: typeof cwd === 'string' ? cwd : undefined,
                    },
                    {
                        onStdout: (chunk) => send('stdout', chunk),
                        onStderr: (chunk) => send('stderr', chunk),
                    },
                );
                send('exit', `Processo finalizado com código ${result.exitCode ?? '?'}`);
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                send('stderr', message);
                send('exit', 'Processo finalizado com erro');
            } finally {
                controller.close();
            }
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
