export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { removeProviderKey } from '@/app/api/_lib/project-env-keys';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ projectId: string; keyId: string }> },
) {
    try {
        const { projectId, keyId } = await params;
        const keyStatus = await removeProviderKey(projectId, keyId);
        return ok({ message: 'API key removed from .env', key: keyStatus });
    } catch (e) {
        if (e instanceof Error) return err('API_KEY_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to remove provider API key', 500);
    }
}
