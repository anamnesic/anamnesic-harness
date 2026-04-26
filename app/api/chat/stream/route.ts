export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { StreamingChatServiceNext } from '@/src/core/services/StreamingChatServiceNext';
import { aiProviderRegistry } from '@/src/core/providers/AIProvider';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const channelId = searchParams.get('channelId');
        const pipelineId = searchParams.get('pipelineId');
        const userId = searchParams.get('userId') || 'anonymous';
        const maxTokens = searchParams.get('maxTokens') ? parseInt(searchParams.get('maxTokens')!, 10) : 2000;
        const temperature = searchParams.get('temperature') ? parseFloat(searchParams.get('temperature')!) : 0.7;

        if (!channelId) {
            return new Response('channelId is required', { status: 400 });
        }

        // Get AI provider
        const provider = aiProviderRegistry.getDefault();
        if (!provider || !(await provider.isAvailable())) {
            return new Response('No AI provider available', { status: 503 });
        }

        // Get chat history for context
        const db = await getDb();
        const { ChatHistoryService } = await import('@/src/core/services/ChatHistoryService');
        const chatService = new ChatHistoryService(db);
        const history = await chatService.getHistoryByChannel(channelId, 10);

        // Create streaming service
        const streamingService = new StreamingChatServiceNext(provider);

        // Start streaming
        const response = await streamingService.createStream(history, {
            channel: channelId,
            pipelineId: pipelineId || undefined,
            userId,
            maxTokens,
            temperature,
        });

        return response;

    } catch (error) {
        console.error('[Chat Stream API] Error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, channelId, userId = 'anonymous' } = body;

        if (!message || !channelId) {
            return new Response('message and channelId are required', { status: 400 });
        }

        // Save user message first
        const db = await getDb();
        const { ChatHistoryService } = await import('@/src/core/services/ChatHistoryService');
        const chatService = new ChatHistoryService(db);
        
        await chatService.saveHistory({
            channelId,
            message,
            sender: 'user',
            metadata: { type: 'request' }
        });

        // Get AI provider
        const provider = aiProviderRegistry.getDefault();
        if (!provider || !(await provider.isAvailable())) {
            return new Response('No AI provider available', { status: 503 });
        }

        // Get chat history for context
        const history = await chatService.getHistoryByChannel(channelId, 10);

        // Create streaming service
        const streamingService = new StreamingChatServiceNext(provider);

        // Start streaming response
        const response = await streamingService.createStream(history, {
            channel: channelId,
            userId,
            maxTokens: 2000,
            temperature: 0.7,
        });

        return response;

    } catch (error) {
        console.error('[Chat Stream API] Error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}
