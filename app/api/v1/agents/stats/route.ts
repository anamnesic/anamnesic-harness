export const runtime = 'nodejs';

import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET() {
    try {
        const db = await getDb();
        const { Agent } = await import('@/src/core/entities/Agent');
        const list = await db.getRepository(Agent).find();

        const totalAgents = list.length;
        const activeAgents = list.filter(a => a.isActive).length;
        const totalTasksCompleted = list.reduce((s, a) => s + (a.tasksCompleted ?? 0), 0);
        const totalTasksFailed = list.reduce((s, a) => s + (a.tasksFailed ?? 0), 0);
        const byState = list.reduce<Record<string, number>>((acc, a) => {
            acc[a.state] = (acc[a.state] ?? 0) + 1;
            return acc;
        }, {});

        return ok({ totalAgents, activeAgents, totalTasksCompleted, totalTasksFailed, byState });
    } catch (e) {
        console.error('[agents/stats] error:', e);
        return err('INTERNAL_ERROR', (e as Error)?.message ?? 'Failed to load agent stats', 500);
    }
}
