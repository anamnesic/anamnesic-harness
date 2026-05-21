export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { getDb } from '@/app/api/_lib/db';
import { aiProviderRegistry, type AIProvider as Provider } from '@/src/core/providers/AIProvider';

type InteractionMode = 'ask' | 'coding';

type ModelSelection = {
    requested: string[];
    supported: string[];
    fallback: string;
};

function createSseResponse(content: string): Response {
    const stream = new ReadableStream({
        start(controller) {
            const emit = (payload: unknown) => {
                controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
            };

            emit({ type: 'start', timestamp: new Date().toISOString() });
            emit({ type: 'chunk', content, timestamp: new Date().toISOString() });
            emit({ type: 'end', timestamp: new Date().toISOString() });
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        },
    });
}

function getCodingRolePrompt(index: number, total: number, modelId: string): string {
    const roles = [
        'Arquiteto de solução: decomponha o problema, identifique riscos e proponha estratégia de implementação.',
        'Implementador: proponha mudanças concretas, trechos de código e passos exatos de execução.',
        'Revisor crítico: busque regressões, edge cases, segurança e performance.',
        'QA/Validação: proponha testes, critérios de aceite e plano de verificação.',
    ];

    const role = roles[index % roles.length];
    return [
        'Você está em um painel multi-modelo para tarefa de coding.',
        `Modelo designado: ${modelId} (${index + 1}/${total}).`,
        role,
        'Responda com foco técnico e prático, com passos acionáveis.',
    ].join(' ');
}

async function getActiveProvider(): Promise<Provider | null> {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

    try {
        const { OllamaProvider } = await import('@/src/core/providers/OllamaProvider');
        const ollama = new OllamaProvider(ollamaBaseUrl);
        if (await ollama.isAvailable()) {
            return ollama;
        }
    } catch {
        // Continue with fallback providers
    }

    try {
        const preferred = aiProviderRegistry.getDefault();
        if (preferred && await preferred.isAvailable()) {
            return preferred;
        }
    } catch {
        // Continue with fallback providers
    }

    return null;
}

async function resolveModelSelection(provider: Provider, requestedModelIds: string[]): Promise<ModelSelection> {
    let supportedModelIds: string[] = [];

    try {
        const models = await provider.getModels();
        supportedModelIds = models.map((m) => m.id).filter(Boolean);
    } catch {
        supportedModelIds = [];
    }

    const uniqueRequested = Array.from(new Set(
        requestedModelIds
            .filter((id) => typeof id === 'string')
            .map((id) => id.trim())
            .filter((id) => id.length > 0)
    ));

    const supported = supportedModelIds.length > 0
        ? uniqueRequested.filter((id) => supportedModelIds.includes(id))
        : uniqueRequested;

    const fallback = supported[0] || supportedModelIds[0] || provider.getDefaultModel?.() || 'default';

    return {
        requested: uniqueRequested,
        supported,
        fallback,
    };
}

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

        const provider = await getActiveProvider();
        if (!provider) {
            return new Response('No AI provider available', { status: 503 });
        }

        // Get chat history for context
        const db = await getDb();
        const { ChatHistoryService } = await import('@/src/core/services/ChatHistoryService');
        const chatService = new ChatHistoryService(db);
        const history = await chatService.getHistoryByChannel(channelId, 10);

        const messages = history
            .slice()
            .reverse()
            .map((entry) => ({
                role: entry.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: entry.message,
            }));

        const selection = await resolveModelSelection(provider, []);
        const chatResponse = await provider.chat(
            {
                messages,
                maxTokens,
                temperature,
            },
            selection.fallback,
        );

        return createSseResponse(chatResponse.message.content || '');

    } catch (error) {
        console.error('[Chat Stream API] Error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            message,
            channelId,
            userId = 'anonymous',
            modelIds = [],
            interactionMode = 'ask',
            systemPrompt,
        } = body as {
            message?: string;
            channelId?: string;
            userId?: string;
            modelIds?: string[];
            interactionMode?: InteractionMode;
            systemPrompt?: string;
        };

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

        const provider = await getActiveProvider();
        if (!provider) {
            return new Response('No AI provider available', { status: 503 });
        }

        // Get chat history for context
        const history = await chatService.getHistoryByChannel(channelId, 10);

        const conversationMessages = history
            .slice()
            .reverse()
            .map((entry) => ({
                role: entry.sender === 'user' ? 'user' as const : 'assistant' as const,
                content: entry.message,
            }));

        const systemMessages: { role: 'system'; content: string }[] = systemPrompt
            ? [{ role: 'system', content: systemPrompt }]
            : [];

        const selection = await resolveModelSelection(provider, Array.isArray(modelIds) ? modelIds : []);

        const safeMode: InteractionMode = interactionMode === 'coding' ? 'coding' : 'ask';
        const fallbackModel = selection.fallback;

        let finalContent = '';
        let usedModels: string[] = [];

        if (safeMode === 'coding' && selection.supported.length > 1) {
            usedModels = selection.supported;

            const results = await Promise.allSettled(
                usedModels.map((modelId, index) =>
                    provider.chat(
                        {
                            messages: [
                                {
                                    role: 'system',
                                    content: getCodingRolePrompt(index, usedModels.length, modelId),
                                },
                                ...systemMessages,
                                ...conversationMessages,
                            ],
                            maxTokens: 2200,
                            temperature: 0.5,
                        },
                        modelId,
                    ),
                ),
            );

            finalContent = results
                .map((result, index) => {
                    const modelId = usedModels[index];
                    if (result.status === 'fulfilled') {
                        const text = result.value.message.content || '(sem conteúdo)';
                        return `### ${modelId}\n${text}`;
                    }
                    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
                    return `### ${modelId}\nFalha ao responder: ${reason}`;
                })
                .join('\n\n---\n\n');
        } else {
            const selectedModel = selection.supported[0] || fallbackModel;
            usedModels = [selectedModel];

            const response = await provider.chat(
                {
                    messages: [...systemMessages, ...conversationMessages],
                    maxTokens: 2000,
                    temperature: 0.7,
                },
                selectedModel,
            );

            finalContent = response.message.content || '';
        }

        await chatService.saveHistory({
            channelId,
            message: finalContent,
            sender: 'assistant',
            metadata: {
                type: 'response',
                interactionMode: safeMode,
                modelIds: usedModels,
                ignoredModelIds: selection.requested.filter((id) => !selection.supported.includes(id)),
            },
        });

        return createSseResponse(finalContent);

    } catch (error) {
        console.error('[Chat Stream API] Error:', error);
        return new Response('Internal server error', { status: 500 });
    }
}
