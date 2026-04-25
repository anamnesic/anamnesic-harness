export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> },
) {
    try {
        const { projectId } = await params;
        const db = await getDb();
        const { ApiKeyService } = await import('@/src/core/services/ApiKeyService');
        const service = new ApiKeyService(db);
        const keys = await service.listByProject(projectId);
        return ok(keys);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list API keys', 500);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> },
) {
    try {
        const { projectId } = await params;
        const body = await req.json();
        if (!body.name) return err('VALIDATION_ERROR', 'name is required', 400);
        const db = await getDb();
        const { ApiKeyService } = await import('@/src/core/services/ApiKeyService');
        const service = new ApiKeyService(db);
        const result = await service.generate(projectId, body.name);
        return ok(result, 201);
    } catch (e) {
        if (e instanceof Error) return err('API_KEY_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to generate API key', 500);
    }
}
