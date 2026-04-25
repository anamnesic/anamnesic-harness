export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ projectId: string; keyId: string }> },
) {
    try {
        const { keyId } = await params;
        const db = await getDb();
        const { ApiKeyService } = await import('@/src/core/services/ApiKeyService');
        const service = new ApiKeyService(db);
        await service.revoke(keyId);
        return ok({ message: 'API key revoked' });
    } catch (e) {
        if (e instanceof Error) return err('API_KEY_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to revoke API key', 500);
    }
}
