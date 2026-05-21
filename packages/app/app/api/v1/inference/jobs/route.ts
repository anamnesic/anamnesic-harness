export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { getCliTaskQueue } from '@/app/api/_lib/llm-cli-runtime';
import { loadRoutingConfig } from '@/app/api/_lib/llm-cli-routing';
import {
    getPromptProfile,
    ProviderRoutingStrategy,
    type CliTaskType,
    type LlmCliProvider,
} from '@/src/core/llm-cli';

function parseTaskType(value: unknown): CliTaskType | undefined {
    const allowed: CliTaskType[] = ['summarization', 'enrichment', 'reranking', 'proactive-planning', 'long-analysis', 'code-automation'];
    if (typeof value !== 'string') return undefined;
    return allowed.includes(value as CliTaskType) ? (value as CliTaskType) : undefined;
}

function parseProviderList(input: unknown): LlmCliProvider[] | undefined {
    if (!Array.isArray(input)) return undefined;
    const allowed: LlmCliProvider[] = ['gemini', 'kairos', 'copilot', 'codex'];
    const parsed = input
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.toLowerCase() as LlmCliProvider)
        .filter((provider) => allowed.includes(provider));

    return parsed.length > 0 ? Array.from(new Set(parsed)) : undefined;
}

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

        const workspaceId = req.headers.get('x-workspace-id') || 'system';
        const taskType = parseTaskType(body?.taskType) ?? 'summarization';
        const contextKey = typeof body?.abTestKey === 'string' ? body.abTestKey : undefined;
        const requestedPreferredProvider = typeof body?.preferredProvider === 'string'
            ? body.preferredProvider.toLowerCase() as LlmCliProvider
            : undefined;
        const requestedFallbackProviders = parseProviderList(body?.fallbackProviders);
        const routingConfig = await loadRoutingConfig(workspaceId).catch(() => ({}));
        const routing = new ProviderRoutingStrategy(routingConfig).resolve({
            taskType,
            preferredProvider: requestedPreferredProvider,
            fallbackProviders: requestedFallbackProviders,
            contextKey,
        });
        const promptProfile = getPromptProfile(taskType);
        const promptClass = body?.promptClass === 'sensitive' ? 'sensitive' : 'operational';
        const sensitive = promptClass === 'sensitive';

        const queue = getCliTaskQueue();
        const id = queue.enqueue({
            prompt,
            preferredProvider: routing.preferredProvider,
            fallbackProviders: routing.fallbackProviders,
            promptClass,
            sensitive,
            metadata: {
                source: 'api-v1-inference-jobs',
                taskType,
                schemaId: promptProfile.schemaId,
                routingReason: routing.reason,
            },
        });

        const task = queue.getTask(id);
        return ok({
            id,
            task,
            routing,
            promptProfile,
        }, 201);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to enqueue inference job', 500, String(error));
    }
}
