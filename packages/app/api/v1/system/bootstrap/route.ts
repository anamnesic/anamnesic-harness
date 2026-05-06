export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb, bootstrapSystem } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

/**
 * Endpoint to trigger system bootstrapping (observers, sync, etc.) 
 * after the user has logged in.
 */
export async function POST(_req: NextRequest) {
    try {
        const db = await getDb();
        await bootstrapSystem(db);
        return ok({ bootstrapped: true });
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message || 'Bootstrap failed', 500);
    }
}
