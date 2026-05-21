export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(_req: NextRequest) {
    try {
        await getDb(); // Ensure initialized
        const { RetentionPolicyService } = await import('@/src/core/services/RetentionPolicyService');
        const service = RetentionPolicyService.getInstance();
        
        return ok(service.getStatus());
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        await getDb(); // Ensure initialized
        
        const { RetentionPolicyService } = await import('@/src/core/services/RetentionPolicyService');
        const service = RetentionPolicyService.getInstance();
        
        await service.updatePolicy(body);
        
        return ok(service.getStatus());
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}
