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
        return ok({
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            totalExecutions: workflow.totalExecutions,
            successfulExecutions: workflow.successfulExecutions,
            failedExecutions: workflow.failedExecutions,
            lastExecutedAt: workflow.lastExecutedAt,
        });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get workflow stats', 500);
    }
}
