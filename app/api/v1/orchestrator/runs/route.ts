export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const status = searchParams.get('status') ?? undefined;

    try {
        const db = await getDb();
        const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRuntimeService(db);
        const runs = workspaceId
            ? await service.listRuns(workspaceId, status)
            : await service.listAllRuns(status);
        return ok(runs);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list orchestrator runs', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const { workspaceId, planId, executionAgentId, autoExecute } = await req.json();
        if (!workspaceId || !planId) return err('VALIDATION_ERROR', 'workspaceId and planId are required', 400);

        const db = await getDb();
        const { OrchestratorRuntimeService: OrchestratorRTService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRTService(db);
        const run = await service.startRun({ workspaceId, planId, executionAgentId, autoExecute });
        return ok(run, 201);
    } catch (error) {
        if (error instanceof Error) return err('ORCHESTRATOR_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to start orchestrator run', 500);
    }
}
