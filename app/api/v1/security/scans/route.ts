export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

const VALID_TYPES = ['code', 'system', 'api', 'dependency', 'infrastructure'] as const;
type ScanType = typeof VALID_TYPES[number];

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const targetId = searchParams.get('targetId');
        
        const db = await getDb();
        const { SecurityAnalysis } = await import('@/src/core/entities/SecurityAnalysis');
        const repo = db.getRepository(SecurityAnalysis);
        
        const scans = await repo.find({
            where: targetId ? { targetId } : {},
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
        : 'system';
    const targetId = typeof body?.targetId === 'string' && body.targetId.trim()
        ? body.targetId.trim()
        : null;

    // For url-based scanners, fall back to using targetName as the effective target
    // when no explicit targetId is provided (the UI lets users paste a URL directly).
    const effectiveTarget = targetId ?? (
        type === 'api' || type === 'infrastructure' || type === 'dependency'
            ? targetName
            : null
    );

    if ((type === 'api' || type === 'infrastructure' || type === 'dependency' || type === 'code') && !effectiveTarget) {
        return err(
            'VALIDATION_ERROR',
            type === 'code'
                ? 'targetId (project) is required for code scans'
                : 'targetId or a URL/path in targetName is required for this scan type',
            400,
        );
    }

    try {
        const db = await getDb();

        // For code scans, use the real project scanner
        if (type === 'code') {
            const { ProjectSecurityScanner } = await import('@/src/core/services/ProjectSecurityScanner');
            const { OpenAIProvider } = await import('@/src/core/providers/openai-provider');
            const { SettingsService } = await import('@/src/core/services/SettingsService');

            const settingsService = new SettingsService(db);
            const aiSettings = await settingsService.getAISettings(workspaceId);

            const aiProvider = new OpenAIProvider({
                model: aiSettings.reasoningModel || 'gpt-4',
                temperature: 0.3,
                maxTokens: 4096,
            }, aiSettings.apiKey || process.env.OPENAI_API_KEY);

            const scanner = new ProjectSecurityScanner(db, aiProvider);

            const result = await scanner.scanProject(effectiveTarget!, targetName, workspaceId, {
                deepScan,
                filePatterns: body?.filePatterns || ['**/*.{ts,tsx,js,jsx,json}'],
                excludePatterns: body?.excludePatterns || ['node_modules', '.git', 'dist'],
            });

            return ok(result, 201);
        }

        const { SecurityAnalysisService } = await import('@/src/core/services/SecurityAnalysisService');
        const service = new SecurityAnalysisService(db);

        if (type === 'api') {
            const { ApiSecurityScanner } = await import('@/src/core/services/SecurityScanners');
            const result = await new ApiSecurityScanner(db).scan(effectiveTarget!, workspaceId);
            result.targetName = targetName;
            const created = await service.create(result);
            return ok(created, 201);
        }

        if (type === 'dependency') {
            const { DependencyScanner } = await import('@/src/core/services/SecurityScanners');
            const result = await new DependencyScanner(db).scan(effectiveTarget!, workspaceId);
            result.targetName = targetName;
            const created = await service.create(result);
            return ok(created, 201);
        }

        if (type === 'infrastructure') {
            const { InfrastructureScanner } = await import('@/src/core/services/SecurityScanners');
            const result = await new InfrastructureScanner(db).scan(effectiveTarget!, workspaceId);
            result.targetName = targetName;
            const created = await service.create(result);
            return ok(created, 201);
        }

        if (type === 'system') {
            const { SystemSecurityScanner } = await import('@/src/core/services/SecurityScanners');
            const result = await new SystemSecurityScanner(db).scan(workspaceId);
            result.targetName = targetName;
            const created = await service.create(result);
            return ok(created, 201);
        }

        return err('VALIDATION_ERROR', `Unsupported scan type: ${type}`, 400);
    } catch (e) {
        console.error('[security/scans POST]', e);
        const msg = e instanceof Error ? e.message : 'Failed to create scan';
        return err('INTERNAL_ERROR', msg, 500);
    }
}
