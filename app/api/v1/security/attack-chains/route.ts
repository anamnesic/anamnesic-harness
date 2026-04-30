export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { vulnerabilities } = body;

        if (!vulnerabilities || !Array.isArray(vulnerabilities)) {
            return err('VALIDATION_ERROR', 'vulnerabilities array is required', 400);
        }
        
        const db = await getDb();
        const { AttackChainAnalysisService } = await import('@/src/core/services/AttackChainAnalysisService');
        
        const service = new AttackChainAnalysisService(db);
        const result = await service.analyzeAttackChains(vulnerabilities);
        
        return ok(result, 201);
    } catch (e) {
        console.error('[security/attack-chains POST]', e);
        return err('INTERNAL_ERROR', 'Failed to analyze attack chains', 500);
    }
}
