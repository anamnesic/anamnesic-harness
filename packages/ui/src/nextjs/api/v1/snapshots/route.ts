export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { listSnapshots, createSnapshot } from './_store';

export async function GET() {
    try {
        const items = await listSnapshots(50);
        return ok(items);
    } catch (error) {
        if (error instanceof Error) return err('SNAPSHOT_ERROR', error.message, 500);
        return err('INTERNAL_ERROR', 'Failed to list snapshots', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const snap = await createSnapshot({
            name: typeof body.name === 'string' ? body.name : undefined,
            description: typeof body.description === 'string' ? body.description : undefined,
            scope: typeof body.scope === 'string' ? body.scope : undefined,
        });
        return ok(snap, 201);
    } catch (error) {
        if (error instanceof Error) return err('SNAPSHOT_ERROR', error.message, 500);
        return err('INTERNAL_ERROR', 'Failed to create snapshot', 500);
    }
}
