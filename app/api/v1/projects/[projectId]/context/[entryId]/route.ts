export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

type Params = Promise<{ projectId: string; entryId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
    try {
        const { entryId } = await params;
        const db = await getDb();
        const { ContextService } = await import('@/src/core/services/ContextService');
        const service = new ContextService(db);
        const entry = await service.get(entryId);
        if (!entry) return err('NOT_FOUND', 'Context entry not found', 404);
        return ok(entry);
    } catch (e) {
        if (e instanceof Error) return err('CONTEXT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to get context entry', 500);
    }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
    try {
        const { entryId } = await params;
        const body = await req.json();
        const db = await getDb();
        const { ContextService } = await import('@/src/core/services/ContextService');
        const service = new ContextService(db);
        const entry = await service.update(entryId, body);
        if (!entry) return err('NOT_FOUND', 'Context entry not found', 404);
        return ok(entry);
    } catch (e) {
        if (e instanceof Error) return err('CONTEXT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to update context entry', 500);
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
    try {
        const { entryId } = await params;
        const db = await getDb();
        const { ContextService } = await import('@/src/core/services/ContextService');
        const service = new ContextService(db);
        await service.delete(entryId);
        return ok({ message: 'Context entry deleted' });
    } catch (e) {
        if (e instanceof Error) return err('CONTEXT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to delete context entry', 500);
    }
}
