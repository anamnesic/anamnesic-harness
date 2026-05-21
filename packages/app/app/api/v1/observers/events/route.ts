export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { ObserverService } from '@/src/core/services/ObserverService';

const observerService = ObserverService.getInstance();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const observerId = searchParams.get('observerId');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        if (!observerId) {
            return err('BAD_REQUEST', 'observerId parameter is required', 400);
        }

        const events = observerService.getRecentEvents(observerId, limit);
        return ok({ events, observerId, count: events.length });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to get observer events', 500);
    }
}
