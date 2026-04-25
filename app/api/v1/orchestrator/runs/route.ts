export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status') ?? undefined;

    if (!workspaceId) return err('VALIDATION_ERROR', 'workspaceId is required', 400);

    try {
        const db = await getDb();
        const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRuntimeService(db);
        const runs = await service.listRuns(workspaceId, status);
        return ok(runs);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list orchestrator runs', 500);
    }
}

export async function POST(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;
    const { auth } = guard;

    try {
        const { workspaceId, planId, executionAgentId, autoExecute } = await req.json();
        if (!workspaceId || !planId) return err('VALIDATION_ERROR', 'workspaceId and planId are required', 400);

        const db = await getDb();
        const { OrchestratorRuntimeService: OrchestratorRTService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRTService(db);
        const run = await service.startRun({
            workspaceId,
            planId,
            executionAgentId,
            requestedByUserId: auth.userId,
            autoExecute,
        });
        return ok(run, 201);
    } catch (error) {
        if (error instanceof Error) return err('ORCHESTRATOR_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to start orchestrator run', 500);
    }
}
