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
    if (!targetName) return err('VALIDATION_ERROR', 'targetName is required', 400);
    if (!VALID_TYPES.includes(type)) {
        return err('VALIDATION_ERROR', `type must be one of ${VALID_TYPES.join(', ')}`, 400);
    }

    const workspaceId = typeof body?.workspaceId === 'string' && body.workspaceId.trim()
        ? body.workspaceId.trim()
        : randomUUID();
    const targetId = typeof body?.targetId === 'string' && body.targetId.trim()
        ? body.targetId.trim()
        : randomUUID();
    const targetPath = typeof body?.targetPath === 'string' ? body.targetPath.trim() : '';

    try {
        const db = await getDb();
        const { SecurityAnalysisService } = await import('@/src/core/services/SecurityAnalysisService');
        const service = new SecurityAnalysisService(db);

        // SecurityAnalysisService has no built-in scanner; persist a baseline
        // analysis record with empty findings (placeholder for future scanners).
        const start = Date.now();
        const created = await service.create({
            workspaceId,
            targetId,
            targetName,
            type,
            vulnerabilities: [],
            recommendations: [],
            scanMethod: 'baseline',
            scannerVersion: '0.1.0',
            durationMs: Date.now() - start,
        });

        if (targetPath) {
            const { SecurityAnalysis } = await import('@/src/core/entities/SecurityAnalysis');
            await db.getRepository(SecurityAnalysis).update(created.id, {
                metadata: { targetPath },
            });
            (created as any).metadata = { targetPath };
        }

        return ok(created, 201);
    } catch (e) {
        console.error('[security/scans POST]', e);
        const msg = e instanceof Error ? e.message : 'Failed to create scan';
        return err('INTERNAL_ERROR', msg, 500);
    }
}
