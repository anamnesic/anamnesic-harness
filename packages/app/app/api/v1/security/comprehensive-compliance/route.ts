export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectPath = searchParams.get('projectPath') || undefined;
        
        const db = await getDb();
        const { ComprehensiveComplianceService } = await import('@/src/core/services/ComprehensiveComplianceService');
        
        const service = new ComprehensiveComplianceService(db);
        const result = await service.performComprehensiveAssessment(projectPath);
        
        return ok(result);
    } catch (e) {
        console.error('[security/comprehensive-compliance GET]', e);
        return err('INTERNAL_ERROR', 'Failed to perform comprehensive compliance assessment', 500);
    }
}
