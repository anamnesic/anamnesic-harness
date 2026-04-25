export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    try {
        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const projectService = new ProjectService(db);
        const projects = await projectService.list();
        return ok(projects);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list projects', 500);
    }
}
