export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';
import { OrchestratorRuntimeService } from '@/src/core/services/OrchestratorRuntimeService';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ planId: string }> }
) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    try {
        const { planId } = await params;
        const db = await getDb();
        const service = new OrchestratorRuntimeService(db);
        const plan = await service.getPlan(planId);
        if (!plan) return err('NOT_FOUND', 'Orchestrator plan not found', 404);
        return ok(plan);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get orchestrator plan', 500);
    }
}
