export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(_req: NextRequest) {
    try {
        await getDb(); // Ensure initialized
        const { AutoSyncService } = await import('@/src/core/services/AutoSyncService');
        const service = AutoSyncService.getInstance();
        
        const success = await service.sync();
        
        return ok({ success });
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}
