export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(_req: NextRequest) {
    try {
        await getDb(); // Ensure initialized
        const { RetentionPolicyService } = await import('@/src/core/services/RetentionPolicyService');
        const service = RetentionPolicyService.getInstance();
        
        const result = await service.runManualCleanup();
        
        return ok(result);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}
