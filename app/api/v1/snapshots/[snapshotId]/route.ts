export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { getSnapshot, deleteSnapshot } from '../_store';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ snapshotId: string }> }
) {
    try {
        const { snapshotId } = await params;
        const snap = await getSnapshot(snapshotId);
        if (!snap) return err('NOT_FOUND', 'Snapshot not found', 404);
        return ok(snap);
    } catch (error) {
        if (error instanceof Error) return err('SNAPSHOT_ERROR', error.message, 500);
        return err('INTERNAL_ERROR', 'Failed to load snapshot', 500);
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ snapshotId: string }> }
) {
    try {
        const { snapshotId } = await params;
        const existing = await getSnapshot(snapshotId);
        if (!existing) return err('NOT_FOUND', 'Snapshot not found', 404);
        await deleteSnapshot(snapshotId);
        return ok({ deleted: true, id: snapshotId });
    } catch (error) {
        if (error instanceof Error) return err('SNAPSHOT_ERROR', error.message, 500);
        return err('INTERNAL_ERROR', 'Failed to delete snapshot', 500);
    }
}
