export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';
import { OrchestratorRuntimeService } from '@/src/core';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ runId: string }> }
) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    try {
        const { runId } = await params;
        const db = await getDb();
        const service = new OrchestratorRuntimeService(db);
        const run = await service.executeRun(runId);
        return ok(run);
    } catch (error) {
        if (error instanceof Error) return err('ORCHESTRATOR_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to execute orchestrator run', 500);
    }
}
