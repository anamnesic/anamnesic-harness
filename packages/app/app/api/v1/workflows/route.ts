export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const workspaceId = req.nextUrl.searchParams.get('workspaceId');
        const db = await getDb();

        if (workspaceId) {
            const { WorkflowService } = await import('@/src/core/services/WorkflowService');
            const service = new WorkflowService(db);
            const workflows = await service.listByWorkspace(workspaceId, false);
            return ok(workflows);
        } else {
            const { Workflow } = await import('@/src/core/entities/Workflow');
            const workflows = await db.getRepository(Workflow).find({ order: { createdAt: 'DESC' } });
            return ok(workflows);
        }
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list workflows', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.name) return err('VALIDATION_ERROR', 'name is required', 400);

        const db = await getDb();
        const { WorkflowService } = await import('@/src/core/services/WorkflowService');
        const service = new WorkflowService(db);
        const workflow = await service.create({
            workspaceId: body.workspaceId ?? 'system',
            name: body.name,
            description: body.description,
            steps: body.steps ?? [],
            triggers: body.triggers ?? [{ type: 'manual', config: {} }],
            schedule: body.schedule,
            retryPolicy: body.retryPolicy,
            timeoutMs: body.timeoutMs,
        });
        return ok(workflow, 201);
    } catch (e) {
        if (e instanceof Error) return err('WORKFLOW_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create workflow', 500);
    }
}
