export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(_req: NextRequest) {
    try {
        await getDb(); // Ensure initialized
        const { AutoSyncService } = await import('@/src/core/services/AutoSyncService');
        const service = AutoSyncService.getInstance();
        
        return ok(service.getStatus());
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}
