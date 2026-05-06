export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    try {
        const { workflowId } = await params;
        const limitParam = req.nextUrl.searchParams.get('limit');
        const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 20) : 20;
        const db = await getDb();
        const { WorkflowService } = await import('@/src/core/services/WorkflowService');
        const service = new WorkflowService(db);
        const existing = await service.getById(workflowId);
        if (!existing) return err('NOT_FOUND', 'Workflow not found', 404);
        const history = await service.getExecutionHistory(workflowId, limit);
        return ok(history);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get execution history', 500);
    }
}
