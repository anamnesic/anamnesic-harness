export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { getBenchmarkInterpretationService } from '@/app/api/_lib/benchmark-interpretation';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const period = (searchParams.get('period') as 'hour' | 'day' | 'week') || 'day';
        const refresh = searchParams.get('refresh') === '1';

        const service = getBenchmarkInterpretationService();
        const result = refresh
            ? await service.run(period)
            : await service.getLatestOrRun(period);

        return ok(result);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e?.message || 'Failed to generate benchmark interpretation', 500);
    }
}
