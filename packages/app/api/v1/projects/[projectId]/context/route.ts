export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const category = searchParams.get('category') ?? undefined;
        const db = await getDb();
        const { ContextService } = await import('@/src/core/services/ContextService');
        const service = new ContextService(db);
        const entries = q
            ? await service.search(projectId, q)
            : await service.listByProject(projectId, category);
        return ok(entries);
    } catch (e) {
        if (e instanceof Error) return err('CONTEXT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to list context entries', 500);
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
    try {
        const { projectId } = await params;
        const body = await req.json();
        const { key, value, category, priority, metadata } = body;
        if (!key || !value) return err('VALIDATION_ERROR', 'key and value are required', 400);
        const db = await getDb();
        const { ContextService } = await import('@/src/core/services/ContextService');
        const service = new ContextService(db);
        const entry = await service.create({ projectId, key, value, category, priority, metadata });
        return ok(entry, 201);
    } catch (e) {
        if (e instanceof Error) return err('CONTEXT_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to create context entry', 500);
    }
}
