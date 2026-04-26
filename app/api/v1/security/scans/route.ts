export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

const VALID_TYPES = ['code', 'system', 'api', 'dependency', 'infrastructure'] as const;
type ScanType = typeof VALID_TYPES[number];

export async function GET() {
    try {
        const db = await getDb();
        const { SecurityAnalysis } = await import('@/src/core/entities/SecurityAnalysis');
        const scans = await db.getRepository(SecurityAnalysis).find({
            order: { analyzedAt: 'DESC' },
            take: 50,
        });
        return ok(scans);
    } catch (e) {
        console.error('[security/scans GET]', e);
        return err('INTERNAL_ERROR', 'Failed to list security scans', 500);
    }
}

export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return err('VALIDATION_ERROR', 'Invalid JSON body', 400);
    }

    const targetName = typeof body?.targetName === 'string' ? body.targetName.trim() : '';
    const type = body?.type as ScanType;
    const deepScan = typeof body?.deepScan === 'boolean' ? body.deepScan : false;
    
    if (!targetName) return err('VALIDATION_ERROR', 'targetName is required', 400);
    if (!VALID_TYPES.includes(type)) {
        return err('VALIDATION_ERROR', `type must be one of ${VALID_TYPES.join(', ')}`, 400);
    }

    const workspaceId = typeof body?.workspaceId === 'string' && body.workspaceId.trim()
        ? body.workspaceId.trim()
        : null;
    const targetId = typeof body?.targetId === 'string' && body.targetId.trim()
        ? body.targetId.trim()
        : null;

    try {
        const db = await getDb();
        
        // For code scans, use the real project scanner
        if (type === 'code' && targetId && workspaceId) {
            const { ProjectSecurityScanner } = await import('@/src/core/services/ProjectSecurityScanner');
            const { OpenAIProvider } = await import('@/src/core/providers/openai-provider');
            
            // Create an OpenAI provider for security analysis
            const aiProvider = new OpenAIProvider({
                model: 'gpt-4',
                temperature: 0.3,
                maxTokens: 4096,
            }, process.env.OPENAI_API_KEY);
            
            const scanner = new ProjectSecurityScanner(db, aiProvider);
            
            const result = await scanner.scanProject(targetId, targetName, workspaceId, {
                deepScan,
                filePatterns: body?.filePatterns || ['**/*.{ts,tsx,js,jsx,json}'],
                excludePatterns: body?.excludePatterns || ['node_modules', '.git', 'dist'],
            });
            
            return ok(result, 201);
        }

        // For non-code scans or missing targetId/workspaceId, fall back to stub implementation
        const { SecurityAnalysisService } = await import('@/src/core/services/SecurityAnalysisService');
        const service = new SecurityAnalysisService(db);

        const start = Date.now();
        const created = await service.create({
            workspaceId: workspaceId || randomUUID(),
            targetId: targetId || randomUUID(),
            targetName,
            type,
            vulnerabilities: [],
            recommendations: [],
            scanMethod: 'baseline',
            scannerVersion: '0.1.0',
            durationMs: Date.now() - start,
        });

        return ok(created, 201);
    } catch (e) {
        console.error('[security/scans POST]', e);
        const msg = e instanceof Error ? e.message : 'Failed to create scan';
        return err('INTERNAL_ERROR', msg, 500);
    }
}
