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
        const { Workflow } = await import('@/src/core/entities/Workflow');
        
        const workflow = await db.getRepository(Workflow).findOne({
            where: { id: workflowId }
        });

        if (!workflow) {
            return err('NOT_FOUND', 'Workflow not found', 404);
        }

        return ok(workflow.steps || []);
    } catch (e) {
        if (e instanceof Error) return err('INTERNAL_ERROR', e.message, 500);
        return err('INTERNAL_ERROR', 'Failed to fetch workflow steps', 500);
    }
}
