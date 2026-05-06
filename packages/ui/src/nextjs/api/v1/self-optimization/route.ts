export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { err, ok } from '@/app/api/_lib/response';
import { ensureSelfOptimizationStarted, getSelfOptimizationService } from '@/app/api/_lib/self-optimization';

function actorFromRequest(req: NextRequest): string {
    return req.headers.get('x-user-id') || req.headers.get('x-workspace-id') || 'ui-user';
}

export async function GET(req: NextRequest) {
    try {
        await ensureSelfOptimizationStarted();
        const service = getSelfOptimizationService();

        const url = new URL(req.url);
        const refresh = url.searchParams.get('refresh') === '1';
        const latest = refresh
            ? await service.runNow()
            : (service.getLatestRun() ?? await service.runNow());

        const historyLimit = Number(url.searchParams.get('historyLimit') || 30);
        const decisions = await service.getDecisionHistory(historyLimit);

        return ok({ latest, decisions });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to fetch self-optimization data', 500, String(error));
    }
}

export async function POST(req: NextRequest) {
    try {
        await ensureSelfOptimizationStarted();
        const service = getSelfOptimizationService();
        const body = await req.json().catch(() => ({}));
        const action = typeof body?.action === 'string' ? body.action : '';

        if (action === 'refresh') {
            const latest = await service.runNow();
            return ok({ latest });
        }

        if (action === 'accept' || action === 'reject') {
            const suggestionId = typeof body?.suggestionId === 'string' ? body.suggestionId : '';
            if (!suggestionId) {
                return err('SUGGESTION_ID_REQUIRED', 'suggestionId is required', 400);
            }

            const reason = typeof body?.reason === 'string' ? body.reason : undefined;
            const decision = await service.recordDecision({
                suggestionId,
                decision: action === 'accept' ? 'accepted' : 'rejected',
                reason,
                actor: actorFromRequest(req),
            });

            return ok({ decision });
        }

        return err('INVALID_ACTION', 'Supported actions: refresh, accept, reject', 400);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to process self-optimization action', 500, String(error));
    }
}
