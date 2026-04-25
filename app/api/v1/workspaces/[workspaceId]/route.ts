export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';
import { WorkspaceService } from '@/src/core/services/WorkspaceService';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    try {
        const { workspaceId } = await params;
        const db = await getDb();
        const workspaceService = new WorkspaceService(db);
        const workspace = await workspaceService.getById(workspaceId);
        if (!workspace) return err('NOT_FOUND', 'Workspace not found', 404);
        return ok(workspace);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get workspace', 500);
    }
}
