export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(_req: NextRequest) {
    try {
        const { IntegrationService } = await import('@/src/core/services/IntegrationService');
        const service = IntegrationService.getInstance();
        return ok(service.listWebhooks());
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, url, type, events, enabled } = body;

        if (!name || !url || !type) {
            return err('VALIDATION_ERROR', 'name, url and type are required', 400);
        }

        const { IntegrationService } = await import('@/src/core/services/IntegrationService');
        const service = IntegrationService.getInstance();
        
        const id = service.registerWebhook({
            name,
            url,
            type,
            events: events || ['*'],
            enabled: enabled !== false
        });

        return ok({ id }, 201);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}
