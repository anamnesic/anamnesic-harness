export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { z } from 'zod';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId') ?? undefined;

    const parsedLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const parsedOffset = Number.parseInt(searchParams.get('offset') ?? '', 10);
    const limit = Math.min(
        Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1),
        200
    );
    const offset = Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0);

    try {
        const db = await getDb();
        const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRuntimeService(db);
        const { items, total } = await service.listPlansPaginated({ workspaceId, limit, offset });
        return ok({ items, total, limit, offset });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list orchestrator plans', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const {
            workspaceId,
            projectId,
            objective,
            constraints,
            availableModalities,
            contextBudgetTokens,
            priority,
            deadlineMinutes,
            policy,
            policyApproval,
        } = await req.json();

        if (!workspaceId || !objective) {
            return err('VALIDATION_ERROR', 'workspaceId and objective are required', 400);
        }

        const db = await getDb();
        const { OrchestratorRuntimeService: OrchestratorRTService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRTService(db);
        const result = await service.createPlan({
            workspaceId,
            projectId,
            request: { objective, constraints, availableModalities, contextBudgetTokens, priority, deadlineMinutes },
            policy,
            policyApproval,
        });
        return ok({ plan: result.plan, warnings: result.warnings }, 201);
    } catch (error) {
        if (error instanceof Error) return err('ORCHESTRATOR_ERROR', error.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create orchestrator plan', 500);
    }
}
