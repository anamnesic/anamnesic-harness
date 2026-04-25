export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';
import { ChatHistoryService } from '@/src/core';
import type { ChatMessage } from '@/src/core';
import crypto from 'crypto';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = await getDb();
        const service = new ChatHistoryService(db);
        const history = await service.getHistoryById(id);
        if (!history) return err('NOT_FOUND', 'History not found', 404);
        return ok({ data: history });
    } catch {
        return err('INTERNAL_ERROR', 'Failed to get chat history', 500);
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body: { message: Omit<ChatMessage, 'id' | 'timestamp'> } = await req.json();
        if (!body.message) return err('VALIDATION_ERROR', 'message object is required', 400);

        const fullMessage: ChatMessage = {
            ...body.message,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };

        const db = await getDb();
        const service = new ChatHistoryService(db);

        let channel = 'default';
        let pipelineId: string | undefined;

        if (id.startsWith('history-pipeline-')) {
            pipelineId = id.replace('history-pipeline-', '');
        } else if (id.startsWith('history-channel-')) {
            channel = id.replace('history-channel-', '');
        }

        const history = await service.addMessage({ channel, pipelineId }, fullMessage);
        return ok({ data: history, message: 'Message added' }, 201);
    } catch {
        return err('INTERNAL_ERROR', 'Failed to add message', 500);
    }
}
