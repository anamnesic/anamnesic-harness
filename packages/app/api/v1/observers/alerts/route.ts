export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { ObserverService } from '@/src/core/services/ObserverService';

const observerService = ObserverService.getInstance();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

        const alerts = observerService.getSemanticAlerts(limit);
        return ok({ alerts, count: alerts.length });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to get observer semantic alerts', 500);
    }
}
