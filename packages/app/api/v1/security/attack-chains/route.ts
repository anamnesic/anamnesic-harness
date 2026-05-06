export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        // For GET requests, return a mock result or stored analysis
        // In production, this would fetch stored attack chain analysis results
        const mockResult = {
            chains: [],
            summary: {
                totalChains: 0,
                criticalChains: 0,
                highRiskChains: 0,
                mediumRiskChains: 0,
                lowRiskChains: 0,
                longestChain: 0,
                averageChainLength: 0,
            },
            commonPatterns: [],
            recommendations: [],
            analyzedAt: new Date().toISOString(),
        };
        
        return ok(mockResult);
    } catch (e) {
        console.error('[security/attack-chains GET]', e);
        return err('INTERNAL_ERROR', 'Failed to fetch attack chains', 500);
    }
}

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
