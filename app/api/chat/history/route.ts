export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function GET(req: NextRequest) {
    try {
        const db = await getDb();
        const { ChatHistoryService } = await import('@/src/core/services/ChatHistoryService');
        const service = new ChatHistoryService(db);
        const { searchParams } = new URL(req.url);
        const history = await service.getHistory({
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
            offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
        });
        return ok({ data: history, count: history.length });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to list chat histories', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.channelId) return err('VALIDATION_ERROR', 'channelId is required', 400);
        const db = await getDb();
        const { ChatHistoryService: ChatHistSvc } = await import('@/src/core/services/ChatHistoryService');
        const service = new ChatHistSvc(db);
        await service.saveHistory({ channelId: body.channelId, message: body.message || '' });
        return ok({ message: 'History saved successfully' }, 201);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to save chat history', 500);
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return err('VALIDATION_ERROR', 'id is required', 400);
        const db = await getDb();
        const { ChatHistoryService } = await import('@/src/core/services/ChatHistoryService');
        const service = new ChatHistoryService(db);
        await service.deleteEntry(id);
        return ok({ message: 'Entry deleted successfully' });
    } catch (e: any) {
        if (e?.message?.includes('not found')) return err('NOT_FOUND', e.message, 404);
        return err('INTERNAL_ERROR', 'Failed to delete chat history entry', 500);
    }
}
