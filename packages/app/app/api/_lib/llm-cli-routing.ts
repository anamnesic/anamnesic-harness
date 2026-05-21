import { getDb } from '@/app/api/_lib/db';
import type { CliRoutingConfig } from '@/src/core/llm-cli';
import type { CliTaskType, LlmCliProvider } from '@/src/core/llm-cli';

const PROVIDERS: LlmCliProvider[] = ['gemini', 'claude', 'copilot', 'codex', 'opencode'];
const TASK_TYPES: CliTaskType[] = ['summarization', 'enrichment', 'reranking', 'proactive-planning', 'long-analysis', 'code-automation'];

export async function loadRoutingConfig(workspaceId: string): Promise<CliRoutingConfig> {
    const db = await getDb();
    const { SettingsService } = await import('@/src/core/services/SettingsService');
    const settingsService = new SettingsService(db);
    const aiSettings = await settingsService.getAIProviderSettings(workspaceId);

    const defaultProvider = parseProvider(aiSettings['routing.defaultProvider']);
    const fallbackOrder = parseProviderList(aiSettings['routing.fallbackOrder']);
    const taskOverrides = parseTaskOverrides(aiSettings['routing.taskOverrides']);
    const abTests = parseAbTests(aiSettings['routing.abTests']);

    return {
        defaultProvider,
        fallbackOrder,
        taskOverrides,
        abTests,
    };
}

function parseProvider(value: unknown): LlmCliProvider | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'kairos') {
        return 'claude';
    }
    if (PROVIDERS.includes(normalized as LlmCliProvider)) {
        return normalized as LlmCliProvider;
    }
    return undefined;
}

function parseProviderList(value: unknown): LlmCliProvider[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const list = value
        .map((item) => parseProvider(item))
        .filter((item): item is LlmCliProvider => Boolean(item));
    return list.length > 0 ? Array.from(new Set(list)) : undefined;
}

function parseTaskOverrides(value: unknown): CliRoutingConfig['taskOverrides'] {
    if (!value || typeof value !== 'object') return undefined;

    const result: Partial<Record<CliTaskType, LlmCliProvider>> = {};
    for (const taskType of TASK_TYPES) {
        const provider = parseProvider((value as Record<string, unknown>)[taskType]);
        if (provider) {
            result[taskType] = provider;
        }
    }
    return Object.keys(result).length > 0 ? result : undefined;
}

function parseAbTests(value: unknown): CliRoutingConfig['abTests'] {
    if (!value || typeof value !== 'object') return undefined;

    const result: NonNullable<CliRoutingConfig['abTests']> = {};
    for (const taskType of TASK_TYPES) {
        const entry = (value as Record<string, unknown>)[taskType];
        if (!entry || typeof entry !== 'object') continue;

        const providers = parseProviderList((entry as Record<string, unknown>).providers);
        if (!providers || providers.length < 2) continue;

        const ratioRaw = (entry as Record<string, unknown>).ratio;
        const ratio = typeof ratioRaw === 'number' ? ratioRaw : undefined;
        const seedRaw = (entry as Record<string, unknown>).seed;
        const seed = typeof seedRaw === 'string' ? seedRaw : undefined;

        result[taskType] = {
            providers: [providers[0], providers[1]],
            ratio,
            seed,
        };
    }

    return Object.keys(result).length > 0 ? result : undefined;
}
