export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { loginSchema } from '@/src/core/validation/schemas';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = loginSchema.parse(body);
    const db = await getDb();
    const { AuthService } = await import('@/src/core/services/AuthService');
    const authService = new AuthService(db);
    const { user, token } = await authService.login({
      email: input.email,
      password: input.password,
    });
    return ok({ user: { id: user.id, email: user.email, fullName: user.fullName }, token });
  } catch (error) {
    if (error instanceof z.ZodError) return err('VALIDATION_ERROR', 'Invalid input', 400, error.flatten());
    if (error instanceof Error) return err('AUTH_ERROR', error.message, 401);
    return err('INTERNAL_ERROR', 'Login failed', 500);
  }
}
