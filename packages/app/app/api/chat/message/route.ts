export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { ok, err } from '@/app/api/_lib/response';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, channelId, sender = 'user' } = body;

        if (!message || !channelId) {
            return err('VALIDATION_ERROR', 'message and channelId are required', 400);
        }

        // Save the user message to history
        const db = await getDb();
        const { ChatHistoryService } = await import('@/src/core/services/ChatHistoryService');
        const chatService = new ChatHistoryService(db);
        
        await chatService.saveHistory({
            channelId,
            message,
            sender,
            metadata: { type: 'request' }
        });

        // Get AI provider and generate response
        const { aiProviderRegistry } = await import('@/src/core/providers/AIProvider');
        const provider = aiProviderRegistry.getDefault();
        
        if (!provider || !(await provider.isAvailable())) {
            return err('AI_UNAVAILABLE', 'No AI provider is available', 503);
        }

        // Get chat history for context
        const history = await chatService.getHistoryByChannel(channelId, 10);
        const messages = history.map(entry => ({
            role: entry.sender === 'user' ? 'user' : 'assistant',
            content: entry.message
        }));

        // Add current message
        messages.push({ role: 'user', content: message });

        // Get AI response
        const response = await provider.chat(
            { messages },
            provider.getDefaultModel?.() || 'default'
        );

        // Save AI response to history
        await chatService.saveHistory({
            channelId,
            message: response.message.content,
            sender: 'assistant',
            metadata: { 
                type: 'response',
                usage: response.usage,
                model: provider.name
            }
        });

        return ok({
            message: response.message.content,
            usage: response.usage,
            model: provider.name
        });

    } catch (error) {
        console.error('[Chat API] Error processing message:', error);
        return err('INTERNAL_ERROR', 'Failed to process chat message', 500);
    }
}
