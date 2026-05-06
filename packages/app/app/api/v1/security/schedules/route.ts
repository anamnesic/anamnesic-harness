export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');
        const due = searchParams.get('due') === 'true';

        const { SecurityScheduleService } = await import('@/src/core/services/SecurityScheduleService');
        const service = new SecurityScheduleService(await getDb());

        if (due) {
            const schedules = await service.getDueSchedules();
            return ok(schedules);
        }

        if (!workspaceId) {
            return err('VALIDATION_ERROR', 'workspaceId is required', 400);
        }

        const schedules = await service.listSchedules(workspaceId);
        return ok(schedules);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { workspaceId, scanType, targetName, targetId, frequency, options } = body;

        if (!workspaceId || !scanType || !frequency) {
            return err('VALIDATION_ERROR', 'workspaceId, scanType, and frequency are required', 400);
        }

        const { SecurityScheduleService } = await import('@/src/core/services/SecurityScheduleService');
        const service = new SecurityScheduleService(await getDb());

        const schedule = await service.createSchedule({
            workspaceId,
            scanType,
            targetName,
            targetId,
            frequency,
            options,
        });

        return ok(schedule, 201);
    } catch (e: any) {
        return err('INTERNAL_ERROR', e.message, 500);
    }
}