export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) {
            return err('VALIDATION_ERROR', 'workspaceId is required', 400);
        }

        const { SecurityScheduleService } = await import('@/src/core/services/SecurityScheduleService');
        const service = new SecurityScheduleService(await getDb());

        const webhooks = await service.listWebhooks(workspaceId);
        return ok(webhooks);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { workspaceId, url, events, secret } = body;

        if (!workspaceId || !url || !events?.length) {
            return err('VALIDATION_ERROR', 'workspaceId, url, and events are required', 400);
        }

        const { SecurityScheduleService } = await import('@/src/core/services/SecurityScheduleService');
        const service = new SecurityScheduleService(await getDb());

        const webhook = await service.createWebhook({
            workspaceId,
            url,
            events,
            secret,
        });

        return ok(webhook, 201);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}