export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    try {
        const { workspaceId } = await params;
        const db = await getDb();
        const { ProjectService } = await import('@/src/core/services/ProjectService');
        const service = new ProjectService(db);

        const items = await service.listByWorkspace(workspaceId);
        return ok({ items, total: items.length });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list workspace repositories', 500);
    }
}
