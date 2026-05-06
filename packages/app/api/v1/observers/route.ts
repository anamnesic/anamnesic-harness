export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';
import { ObserverService } from '@/src/core/services/ObserverService';

const observerService = ObserverService.getInstance();

export async function GET() {
    try {
        const observers = observerService.getObserverStatuses();
        return ok({ observers });
    } catch (error) {
        return err('INTERNAL_ERROR', 'Failed to get observer statuses', 500);
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, active }: { id: string; active: boolean } = await req.json();
        
        const observer = await observerService.toggleObserver(id, active);
        return ok({ observer });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unknown observer')) {
            return err('NOT_FOUND', error.message, 404);
        }
        return err('INTERNAL_ERROR', 'Failed to update observer', 500);
    }
}
