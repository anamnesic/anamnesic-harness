export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    try {
        const { workflowId } = await params;
        const db = await getDb();
        const { WorkflowService } = await import('@/src/core/services/WorkflowService');
        const service = new WorkflowService(db);
        const workflow = await service.getById(workflowId);
        if (!workflow) return err('NOT_FOUND', 'Workflow not found', 404);
        return ok(workflow);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get workflow', 500);
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    try {
        const { workflowId } = await params;
        const body = await req.json();
        const db = await getDb();
        const { WorkflowService } = await import('@/src/core/services/WorkflowService');
        const service = new WorkflowService(db);
        const updates: Record<string, unknown> = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.description !== undefined) updates.description = body.description;
        if (body.steps !== undefined) updates.steps = body.steps;
        if (body.triggers !== undefined) updates.triggers = body.triggers;
        if (body.schedule !== undefined) updates.schedule = body.schedule;
        if (body.retryPolicy !== undefined) updates.retryPolicy = body.retryPolicy;
        if (body.status !== undefined) updates.status = body.status;
        const workflow = await service.update(workflowId, updates as any);
        if (!workflow) return err('NOT_FOUND', 'Workflow not found', 404);
        return ok(workflow);
    } catch (e) {
        if (e instanceof Error) return err('WORKFLOW_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to update workflow', 500);
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    try {
        const { workflowId } = await params;
        const db = await getDb();
        const { WorkflowService } = await import('@/src/core/services/WorkflowService');
        const service = new WorkflowService(db);
        const existing = await service.getById(workflowId);
        if (!existing) return err('NOT_FOUND', 'Workflow not found', 404);
        await service.delete(workflowId);
        return ok({ deleted: true });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to delete workflow', 500);
    }
}
