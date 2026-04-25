export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { requireAuth } from '@/app/api/_lib/auth';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;
    const { auth } = guard;

    try {
        const db = await getDb();
        const { AuthService } = await import('@/src/core/services/AuthService');
        const authService = new AuthService(db);
        const user = await authService.getUserById(auth.userId);
        return ok({ user });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get user', 500);
    }
}
