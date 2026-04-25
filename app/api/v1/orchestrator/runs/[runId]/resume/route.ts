export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    try {
        const { runId } = await params;
        const db = await getDb();
        const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRuntimeService(db);
        const run = await service.resumeRun(runId);
        return ok(run);
    } catch (error) {
        if (error instanceof Error) return err('ORCHESTRATOR_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to resume orchestrator run', 500);
    }
}
