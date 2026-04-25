export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { requireAuth, getAuthContext } from '@/app/api/_lib/auth';
import { ok, err } from '@/app/api/_lib/response';
import { ChatHistoryService } from '@/src/core';
import type { HistoryFilter, SaveHistoryInput } from '@/src/core';

export async function GET(req: NextRequest) {
    const auth = getAuthContext(req);
    if (!auth) return err('UNAUTHORIZED', 'Missing or invalid token', 401);

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId') || auth.workspaceId;

    if (!workspaceId) return err('VALIDATION_ERROR', 'workspaceId is required', 400);

    try {
        const db = await getDb();
        const service = new ChatHistoryService(db);

        const filter: HistoryFilter = {
            projectId: searchParams.get('projectId') ?? undefined,
            pipelineId: searchParams.get('pipelineId') ?? undefined,
            channel: searchParams.get('channel') ?? undefined,
            workspace: workspaceId,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
            offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
        };

        if (searchParams.get('fromDate')) filter.fromDate = new Date(searchParams.get('fromDate')!);
        if (searchParams.get('toDate')) filter.toDate = new Date(searchParams.get('toDate')!);

        const histories = await service.listHistories(filter);
        return ok({ data: histories, count: histories.length });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list chat histories', 500);
    }
}

export async function POST(req: NextRequest) {
    const guard = requireAuth(req);
    if ('error' in guard) return guard.error;
    const { auth } = guard;

    try {
        const body: SaveHistoryInput = await req.json();
        if (!body.channel) return err('VALIDATION_ERROR', 'channel is required', 400);
        if (!body.messages || !Array.isArray(body.messages)) return err('VALIDATION_ERROR', 'messages array is required', 400);

        const db = await getDb();
        const service = new ChatHistoryService(db);
        const history = await service.saveHistory({
            projectId: body.projectId,
            pipelineId: body.pipelineId,
            channel: body.channel,
            workspace: auth.workspaceId || body.workspace || '',
            messages: body.messages,
        });
        return ok({ data: history, message: 'History saved successfully' }, 201);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to save chat history', 500);
    }
}
