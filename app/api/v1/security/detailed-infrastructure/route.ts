export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const targetScope = searchParams.get('targetScope') || undefined;
        
        const db = await getDb();
        const { DetailedInfrastructureAnalysisService } = await import('@/src/core/services/DetailedInfrastructureAnalysisService');
        
        const service = new DetailedInfrastructureAnalysisService(db);
        const result = await service.analyzeDetailedInfrastructure(targetScope);
        
        return ok(result);
    } catch (e) {
        console.error('[security/detailed-infrastructure GET]', e);
        return err('INTERNAL_ERROR', 'Failed to perform detailed infrastructure analysis', 500);
    }
}
