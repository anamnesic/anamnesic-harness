export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectPath = searchParams.get('projectPath') || undefined;
        
        const db = await getDb();
        const { SystemAnalysisService } = await import('@/src/core/services/SystemAnalysisService');
        
        const service = new SystemAnalysisService(db);
        const result = await service.analyzeSystem(projectPath);
        
        return ok(result);
    } catch (e) {
        console.error('[system/analysis GET]', e);
        return err('INTERNAL_ERROR', 'Failed to analyze system', 500);
    }
}
