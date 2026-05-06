export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectPath = searchParams.get('projectPath') || undefined;
        
        const db = await getDb();
        const { PackageVulnerabilityService } = await import('@/src/core/services/PackageVulnerabilityService');
        
        const service = new PackageVulnerabilityService(db);
        const result = await service.scanPackageVulnerabilities(projectPath);
        
        return ok(result);
    } catch (e) {
        console.error('[security/package-vulnerabilities GET]', e);
        return err('INTERNAL_ERROR', 'Failed to scan package vulnerabilities', 500);
    }
}
