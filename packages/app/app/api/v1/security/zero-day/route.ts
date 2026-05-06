export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectPath = searchParams.get('projectPath') || undefined;
        
        const db = await getDb();
        const { ZeroDayDiscoveryService } = await import('@/src/core/services/ZeroDayDiscoveryService');
        
        const service = new ZeroDayDiscoveryService(db);
        const result = await service.discoverZeroDays(projectPath);
        
        return ok(result);
    } catch (e) {
        console.error('[security/zero-day GET]', e);
        return err('INTERNAL_ERROR', 'Failed to discover zero-day vulnerabilities', 500);
    }
}
