export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const query = typeof body?.query === 'string' ? body.query.trim() : '';
        const tokenBudget = typeof body?.tokenBudget === 'number' ? body.tokenBudget : 2000;
        const projectId = typeof body?.projectId === 'string'
            ? body.projectId
            : (req.headers.get('x-project-id') || '').trim();

        if (!projectId) {
            return err('PROJECT_ID_REQUIRED', 'projectId is required', 400);
        }
        if (!query) {
            return err('QUERY_REQUIRED', 'query is required', 400);
        }

        const db = await getDb();
        const { ContextBuilder } = await import('@/src/recall');
        const builder = new ContextBuilder(db);
        const window = await builder.build(projectId, query, tokenBudget);

        return ok(window);
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to build reranked recall context', 500, String(error));
    }
}
