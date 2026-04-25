export const runtime = 'nodejs';

import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET() {
    try {
        const db = await getDb();
        const { Workflow } = await import('@/src/core/entities/Workflow');
        const list = await db.getRepository(Workflow).find();

        const total = list.length;
        const active = list.filter(w => w.status === 'active').length;
        const totalExecutions = list.reduce((s, w) => s + (w.totalExecutions ?? 0), 0);
        const successfulExecutions = list.reduce((s, w) => s + (w.successfulExecutions ?? 0), 0);
        const failedExecutions = list.reduce((s, w) => s + (w.failedExecutions ?? 0), 0);
        const successRate = totalExecutions === 0 ? 0 : Math.round((successfulExecutions / totalExecutions) * 100);

        return ok({ total, active, totalExecutions, successfulExecutions, failedExecutions, successRate });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to load workflow stats', 500);
    }
}
