export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

const VALID_TYPES = ['code', 'system', 'api', 'dependency', 'infrastructure', 'comprehensive'] as const;
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

    if ((type === 'api' || type === 'infrastructure' || type === 'dependency' || type === 'code' || type === 'comprehensive') && !effectiveTarget) {
        return err(
            'VALIDATION_ERROR',
            type === 'code' || type === 'comprehensive'
                ? 'targetId (project) is required for code scans'
                : 'targetId or a URL/path in targetName is required for this scan type',
            400,
        );
    }

    try {
        const db = await getDb();

        // Comprehensive scan - runs all scan types
        if (type === 'comprehensive') {
            const { SecurityAnalysisService } = await import('@/src/core/services/SecurityAnalysisService');
            const service = new SecurityAnalysisService(db);
            
            const allVulnerabilities: any[] = [];
            const allRecommendations: any[] = [];
            const startTime = Date.now();

            // Run code scan
            try {
                const { ProjectSecurityScanner } = await import('@/src/core/services/ProjectSecurityScanner');
                const { OpenAIProvider } = await import('@/src/core/providers/openai-provider');
                
                const aiProvider = new OpenAIProvider({
                    model: 'gpt-4',
                    temperature: 0.3,
                    maxTokens: 4096,
                }, process.env.OPENAI_API_KEY);

                const scanner = new ProjectSecurityScanner(db, aiProvider);
                const codeResult: any = await scanner.scanProject(effectiveTarget!, targetName, workspaceId, {
                    deepScan,
                    filePatterns: body?.filePatterns || ['**/*.{ts,tsx,js,jsx,json}'],
                    excludePatterns: body?.excludePatterns || ['node_modules', '.git', 'dist'],
                });
                
                if (codeResult.vulnerabilities) {
                    allVulnerabilities.push(...codeResult.vulnerabilities);
                }
                if (codeResult.recommendations) {
                    allRecommendations.push(...codeResult.recommendations);
                }
            } catch (e) {
                console.error('[comprehensive scan] code scan failed', e);
            }

            // Run system scan
            try {
                const { SystemSecurityScanner } = await import('@/src/core/services/SecurityScanners');
                const systemResult = await new SystemSecurityScanner(db).scan(workspaceId);
                allVulnerabilities.push(...systemResult.vulnerabilities);
                allRecommendations.push(...systemResult.recommendations);
            } catch (e) {
                console.error('[comprehensive scan] system scan failed', e);
            }

            // Run API scan (if API URL provided)
            if (body?.apiUrl) {
                try {
                    const { ApiSecurityScanner } = await import('@/src/core/services/SecurityScanners');
                    const apiResult = await new ApiSecurityScanner(db).scan(body.apiUrl, workspaceId);
                    allVulnerabilities.push(...apiResult.vulnerabilities);
                    allRecommendations.push(...apiResult.recommendations);
                } catch (e) {
                    console.error('[comprehensive scan] API scan failed', e);
                }
            }

            // Run dependency scan
            try {
                const { DependencyScanner } = await import('@/src/core/services/SecurityScanners');
                const depResult = await new DependencyScanner(db).scan(effectiveTarget!, workspaceId);
                allVulnerabilities.push(...depResult.vulnerabilities);
                allRecommendations.push(...depResult.recommendations);
            } catch (e) {
                console.error('[comprehensive scan] dependency scan failed', e);
            }

            // Run infrastructure scan
            try {
                const { InfrastructureScanner } = await import('@/src/core/services/SecurityScanners');
                const infraResult = await new InfrastructureScanner(db).scan(effectiveTarget!, workspaceId);
                allVulnerabilities.push(...infraResult.vulnerabilities);
                allRecommendations.push(...infraResult.recommendations);
            } catch (e) {
                console.error('[comprehensive scan] infrastructure scan failed', e);
            }

            // Calculate overall severity
            const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
            allVulnerabilities.forEach((v: any) => {
                if (severityCounts[v.severity as keyof typeof severityCounts] !== undefined) {
                    severityCounts[v.severity as keyof typeof severityCounts]++;
                }
            });

            let overallSeverity: 'critical' | 'high' | 'medium' | 'low' = 'low';
            if (severityCounts.critical > 0) overallSeverity = 'critical';
            else if (severityCounts.high > 0) overallSeverity = 'high';
            else if (severityCounts.medium > 0) overallSeverity = 'medium';

            const comprehensiveResult: any = {
                workspaceId,
                targetId: effectiveTarget!,
                targetName: `${targetName} (Comprehensive)`,
                type: 'comprehensive' as const,
                severity: overallSeverity,
                vulnerabilityCount: allVulnerabilities.length,
                vulnerabilities: allVulnerabilities,
                recommendations: allRecommendations,
                scanMethod: 'comprehensive-multi-scan',
                durationMs: Date.now() - startTime,
                scannerVersion: '1.0.0',
                metadata: {
                    scansRun: ['code', 'system', 'dependency', 'infrastructure'],
                    severityBreakdown: severityCounts,
                },
            };

            const created = await service.create(comprehensiveResult);
            return ok(created, 201);
        }

        // For code scans, use the real project scanner
        if (type === 'code') {
            const { ProjectSecurityScanner } = await import('@/src/core/services/ProjectSecurityScanner');
            const { OpenAIProvider } = await import('@/src/core/providers/openai-provider');
            const { SettingsService } = await import('@/src/core/services/SettingsService');

            const settingsService = new SettingsService(db);
            const aiSettings = await settingsService.getSetting('aiSettings', workspaceId) as any;

            const aiProvider = new OpenAIProvider({
                model: aiSettings?.reasoningModel || 'gpt-4',
                temperature: 0.3,
                maxTokens: 4096,
            }, aiSettings?.apiKey || process.env.OPENAI_API_KEY);

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
