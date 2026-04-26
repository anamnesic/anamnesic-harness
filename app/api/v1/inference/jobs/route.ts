export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { getCliTaskQueue } from '@/app/api/_lib/llm-cli-runtime';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get('taskId');
        const queue = getCliTaskQueue();

        if (taskId) {
            const task = queue.getTask(taskId);
            if (!task) {
                return err('NOT_FOUND', 'Inference job not found', 404);
            }
            return ok({ task });
        }

        return ok({
            tasks: queue.listTasks(),
            stats: queue.stats(),
        });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to list inference jobs', 500, String(error));
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        if (!prompt) {
            return err('PROMPT_REQUIRED', 'prompt is required', 400);
        }

        const preferredProvider = typeof body?.preferredProvider === 'string' ? body.preferredProvider : 'gemini';
        const fallbackProviders = Array.isArray(body?.fallbackProviders) ? body.fallbackProviders : ['claude', 'copilot', 'codex'];
        const promptClass = body?.promptClass === 'sensitive' ? 'sensitive' : 'operational';
        const sensitive = promptClass === 'sensitive';

        const queue = getCliTaskQueue();
        const id = queue.enqueue({
            prompt,
            preferredProvider,
            fallbackProviders,
            promptClass,
            sensitive,
            metadata: {
                source: 'api-v1-inference-jobs',
            },
        });

        const task = queue.getTask(id);
        return ok({ id, task }, 201);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to enqueue inference job', 500, String(error));
    }
}
