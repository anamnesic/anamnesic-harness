export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    try {
        const { runId } = await params;
        const db = await getDb();
        const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRuntimeService(db);
        const run = await service.getRun(runId);
        if (!run) return err('NOT_FOUND', 'Orchestrator run not found', 404);
        return ok(run);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get orchestrator run', 500);
    }
}
