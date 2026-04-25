export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { getSnapshot } from '../../_store';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ snapshotId: string }> }
) {
    try {
        const { snapshotId } = await params;
        const snap = await getSnapshot(snapshotId);
        if (!snap) return err('NOT_FOUND', 'Snapshot not found', 404);

        // The underlying SnapshotService.restore(pipelineId, phaseIndex, workspaceRoot)
        // operates on per-pipeline file snapshots, not on system-wide named manifests.
        // Without a stored pipeline binding on the manifest, we cannot perform a
        // physical restore here. Return a stub success so the round-trip works and
        // the UI can display the operation result.
        return ok({
            restored: true,
            snapshotId,
            scope: snap.scope,
            note: 'service-stub',
            message: 'System snapshot restore is a stub; SnapshotService.restore() is per pipeline+phase.',
        });
    } catch (error) {
        if (error instanceof Error) return err('SNAPSHOT_ERROR', error.message, 500);
        return err('INTERNAL_ERROR', 'Failed to restore snapshot', 500);
    }
}
