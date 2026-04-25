export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';
import { z } from 'zod';

export async function GET(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    if (!workspaceId) return err('VALIDATION_ERROR', 'workspaceId is required', 400);

    try {
        const db = await getDb();
        const { OrchestratorRuntimeService } = await import('@/src/core/services/OrchestratorRuntimeService');
        const service = new OrchestratorRuntimeService(db);
        const plans = await service.listPlans(workspaceId);
        return ok(plans);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list orchestrator plans', 500);
    }
}

export async function POST(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;
    const { auth } = guard;

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
            createdByUserId: auth.userId,
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
