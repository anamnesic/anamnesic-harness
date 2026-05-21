export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const targetUrl = searchParams.get('targetUrl');
        
        if (!targetUrl) {
            return err('VALIDATION_ERROR', 'targetUrl is required', 400);
        }

        // Validate URL format
        try {
            new URL(targetUrl);
        } catch {
            return err('VALIDATION_ERROR', 'Invalid URL format', 400);
        }
        
        const db = await getDb();
        const { APIAnalysisService } = await import('@/src/core/services/APIAnalysisService');
        
        const service = new APIAnalysisService(db);
        const result = await service.analyzeAPI(targetUrl);
        
        return ok(result);
    } catch (e) {
        console.error('[security/api-analysis GET]', e);
        return err('INTERNAL_ERROR', 'Failed to analyze API', 500);
    }
}
