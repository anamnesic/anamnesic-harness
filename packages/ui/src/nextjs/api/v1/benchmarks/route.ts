export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const period = (searchParams.get('period') as 'hour' | 'day' | 'week') || 'day';

        const db = await getDb();
        const { MetricsService } = await import('@/src/core/services/MetricsService');
        const { ModelBenchmarkService } = await import('@/src/core/services/ModelBenchmarkService');
        
        const metricsService = MetricsService.getInstance(db);
        const benchmarkService = ModelBenchmarkService.getInstance(metricsService);
        
        const report = benchmarkService.generateReport(period);
        
        return ok(report);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message || 'Failed to generate benchmark report', 500);
    }
}
