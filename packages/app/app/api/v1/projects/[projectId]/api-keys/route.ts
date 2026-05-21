export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { readProviderKeyStatuses, setProviderKey } from '@/app/api/_lib/project-env-keys';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> },
) {
    try {
        const { projectId } = await params;
        const payload = await readProviderKeyStatuses(projectId);
        return ok({
            projectId,
            repositoryPath: payload.repoPath,
            envFilePath: payload.envFilePath,
            keys: payload.keys,
        });
    } catch (e) {
        if (e instanceof Error) {
            return err('API_KEY_ERROR', e.message, 400);
        }
        return err('INTERNAL_ERROR', 'Failed to read repository .env API keys', 500);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> },
) {
    try {
        const { projectId } = await params;
        const body = await req.json();
        const provider = typeof body.provider === 'string' ? body.provider : '';
        const value = typeof body.value === 'string' ? body.value : '';

        if (!provider) {
            return err('VALIDATION_ERROR', 'provider is required', 400);
        }
        if (!value.trim()) {
            return err('VALIDATION_ERROR', 'value is required', 400);
        }

        const keyStatus = await setProviderKey(projectId, provider, value);
        return ok(keyStatus, 201);
    } catch (e) {
        if (e instanceof Error) return err('API_KEY_ERROR', e.message, 400);
        return err('INTERNAL_ERROR', 'Failed to set provider API key', 500);
    }
}
