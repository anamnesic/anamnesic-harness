export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { getSnapshot, restoreSnapshot } from '../../_store';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ snapshotId: string }> }
) {
    try {
        const { snapshotId } = await params;
        const snap = await getSnapshot(snapshotId);
        if (!snap) return err('NOT_FOUND', 'Snapshot not found', 404);

        // Perform actual restore
        const result = await restoreSnapshot(snapshotId);
        
        return ok({
            restored: result.restored,
            errors: result.errors,
            snapshotId,
            scope: snap.scope,
            fileCount: snap.fileCount,
            workspaceRoot: snap.workspaceRoot,
            message: `Restored ${result.restored} files${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`,
        });
    } catch (error) {
        if (error instanceof Error) return err('SNAPSHOT_ERROR', error.message, 500);
        return err('INTERNAL_ERROR', 'Failed to restore snapshot', 500);
    }
}
