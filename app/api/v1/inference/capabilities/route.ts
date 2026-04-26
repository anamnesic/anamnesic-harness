export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { loadRoutingConfig } from '@/app/api/_lib/llm-cli-routing';
import {
    CLI_CAPABILITY_MATRIX,
    PROMPT_PROFILES,
    ProviderRoutingStrategy,
} from '@/src/core/llm-cli';

export async function GET(req: NextRequest) {
    try {
        const workspaceId = req.headers.get('x-workspace-id') || 'system';
        const routingConfig = await loadRoutingConfig(workspaceId).catch(() => ({}));
        const strategy = new ProviderRoutingStrategy(routingConfig);

        return ok({
            workspaceId,
            matrix: CLI_CAPABILITY_MATRIX,
            promptProfiles: PROMPT_PROFILES,
            routingConfig,
            resolvedDefaults: {
                summarization: strategy.resolve({ taskType: 'summarization' }),
                enrichment: strategy.resolve({ taskType: 'enrichment' }),
                reranking: strategy.resolve({ taskType: 'reranking' }),
                'proactive-planning': strategy.resolve({ taskType: 'proactive-planning' }),
                'long-analysis': strategy.resolve({ taskType: 'long-analysis' }),
                'code-automation': strategy.resolve({ taskType: 'code-automation' }),
            },
        });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to load inference capabilities', 500, String(error));
    }
}
