export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectPath = searchParams.get('projectPath') || undefined;
        
        const db = await getDb();
        const { DangerousPatternDetectionService } = await import('@/src/core/services/DangerousPatternDetectionService');
        
        const service = new DangerousPatternDetectionService(db);
        const result = await service.detectDangerousPatterns(projectPath);
        
        return ok(result);
    } catch (e) {
        console.error('[security/dangerous-patterns GET]', e);
        return err('INTERNAL_ERROR', 'Failed to detect dangerous patterns', 500);
    }
}
