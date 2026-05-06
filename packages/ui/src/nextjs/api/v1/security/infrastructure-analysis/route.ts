export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectPath = searchParams.get('projectPath') || undefined;
        
        const db = await getDb();
        const { InfrastructureAnalysisService } = await import('@/src/core/services/InfrastructureAnalysisService');
        
        const service = new InfrastructureAnalysisService(db);
        const result = await service.analyzeInfrastructure(projectPath);
        
        return ok(result);
    } catch (e) {
        console.error('[security/infrastructure-analysis GET]', e);
        return err('INTERNAL_ERROR', 'Failed to analyze infrastructure', 500);
    }
}
