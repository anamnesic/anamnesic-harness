export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return err('VALIDATION_ERROR', 'Email and password are required', 400);
        }

        const db = await getDb();
        const { AuthService } = await import('@/src/core/services/AuthService');
        
        const authService = new AuthService(db);
        try {
            const { user, token } = await authService.login({ email, password });
            
            // Don't send password hash
            const { passwordHash, ...safeUser } = user as any;
            
            return ok({
                user: safeUser,
                token
            });
        } catch (e: any) {
            return err('AUTHENTICATION_ERROR', e.message || 'Invalid credentials', 401);
        }
    } catch (e) {
        if (e instanceof Error) return err('INTERNAL_ERROR', e.message, 500);
        return err('INTERNAL_ERROR', 'Failed to login', 500);
    }
}
