export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectPath = searchParams.get('projectPath') || undefined;
        
        const db = await getDb();
        const { ComplianceAssessmentService } = await import('@/src/core/services/ComplianceAssessmentService');
        
        const service = new ComplianceAssessmentService(db);
        const result = await service.assessCompliance(projectPath);
        
        return ok(result);
    } catch (e) {
        console.error('[security/compliance GET]', e);
        return err('INTERNAL_ERROR', 'Failed to assess compliance', 500);
    }
}
