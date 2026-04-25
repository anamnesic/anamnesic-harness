export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;

    try {
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.substring(7) || '';
        const db = await getDb();
        const { AuthService } = await import('@/src/core/services/AuthService');
        const authService = new AuthService(db);
        const newToken = await authService.refreshToken(token);
        return ok({ token: newToken });
    } catch {
        return err('AUTH_ERROR', 'Token refresh failed', 401);
    }
}
