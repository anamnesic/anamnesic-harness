'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, MessageSquare, Trash2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { AVAILABLE_MODELS } from '@/src/config/models';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  type?: 'request' | 'response';
}

interface ChatPanelProps {
  channelId?: string;
  className?: string;
}

type InteractionMode = 'ask' | 'coding';

function detectInteractionMode(message: string): InteractionMode {
  const normalized = message.trim().toLowerCase();

  if (normalized.startsWith('/ask') || normalized.startsWith('ask:')) {
    return 'ask';
  }

  if (normalized.startsWith('/code') || normalized.startsWith('code:')) {
    return 'coding';
  }

  const codingSignals = [
    'codigo', 'code', 'implementar', 'implement', 'refator', 'bug', 'fix',
    'função', 'funcao', 'function', 'classe', 'class', 'typescript', 'javascript',
    'python', 'api', 'endpoint', 'teste', 'test', 'debug', 'erro', 'stacktrace',
  ];

  if (normalized.includes('```')) {
    return 'coding';
  }

  return codingSignals.some((signal) => normalized.includes(signal)) ? 'coding' : 'ask';
}

export function ChatPanel({ channelId = 'default', className }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [availableModelIds, setAvailableModelIds] = useState<string[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load chat history
  const loadHistory = useCallback(async () => {
    try {
      const response = await apiFetch<{
        items: Array<{
          id: string;
          message: string;
          sender: string;
          createdAt: string;
          metadata?: { type?: string };
        }>;
      }>(`/api/chat/history?channelId=${channelId}&limit=50`);
      
      const formattedMessages = response.items.map(item => ({
        id: item.id,
        content: item.message,
        sender: item.sender as 'user' | 'assistant',
        timestamp: item.createdAt,
        type: item.metadata?.type as 'request' | 'response',
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Falha ao carregar histórico do chat:', error);
      toast('Falha ao carregar histórico do chat', 'error');
    }
  }, [channelId, toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    let isMounted = true;

    async function loadAvailableModels() {
      try {
        const availability = await apiFetch<{ data?: { models?: Record<string, boolean> } } | { models?: Record<string, boolean> }>('/api/v1/system/ai-availability');
        const payload = (availability as any)?.data ?? availability;
        const modelFlags: Record<string, boolean> = payload?.models ?? {};

        const enabled = AVAILABLE_MODELS
          .filter((m) => modelFlags[m.id])
          .map((m) => m.id);

        if (!isMounted) {
          return;
        }

        setAvailableModelIds(enabled);
        setSelectedModelIds((current) => {
          const kept = current.filter((id) => enabled.includes(id));
          if (kept.length > 0) {
            return kept;
          }
          return enabled.slice(0, Math.min(3, enabled.length));
        });
      } catch (error) {
        console.error('Falha ao carregar modelos disponíveis:', error);
      }
    }

    loadAvailableModels();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!modelMenuRef.current) {
        return;
      }
      if (!modelMenuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };

    if (isModelMenuOpen) {
      document.addEventListener('mousedown', onClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [isModelMenuOpen]);

  const lastScrollTime = useRef(0);

  // Auto-scroll to bottom
  useEffect(() => {
    const now = Date.now();
    const behavior = isStreaming && now - lastScrollTime.current < 150 ? 'auto' : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior });
    lastScrollTime.current = now;
  }, [messages, streamContent, isStreaming]);

  // Handle streaming response
  const handleStreamResponse = useCallback(async (message: string, interactionMode: InteractionMode) => {
    setIsStreaming(true);
    setStreamContent('');

    const modelIds = selectedModelIds.length > 0
      ? selectedModelIds
      : availableModelIds.slice(0, 1);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kairos-token')}`
        },
        body: JSON.stringify({
          message,
          channelId,
          userId: 'current-user',
          modelIds,
          interactionMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulated = '';
      let lastUpdate = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'chunk':
                  accumulated += (data.content || '');
                  // Batch updates to every 80ms
                  const now = Date.now();
                  if (now - lastUpdate > 80) {
                    setStreamContent(accumulated);
                    lastUpdate = now;
                  }
                  break;
                case 'end':
                  setStreamContent(accumulated);
                  setIsStreaming(false);
                  setTimeout(() => {
                    setStreamContent('');
                    loadHistory();
                  }, 500);
                  break;
                case 'error':
                  throw new Error(data.error || 'Stream error');
              }
            } catch (parseError) {
              console.error('Failed to parse stream data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      toast(error instanceof Error ? error.message : 'Falha no streaming', 'error');
      setIsStreaming(false);
      setStreamContent('');
    }
  }, [channelId, toast, loadHistory, selectedModelIds, availableModelIds]);

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || isStreaming) return;

    const messageContent = input.trim();
    const interactionMode = detectInteractionMode(messageContent);
    setInput('');
    setIsLoading(true);

    try {
      // Save user message and get streaming response
      await handleStreamResponse(messageContent, interactionMode);
    } catch (error) {
      console.error('Falha ao enviar mensagem:', error);
      toast('Falha ao enviar mensagem', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, isStreaming, handleStreamResponse, toast]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Clear chat
  const handleClearChat = useCallback(async () => {
    try {
      // Delete all messages in this channel
      const response = await apiFetch(`/api/chat/history?channelId=${channelId}`, {
        method: 'DELETE',
      });
      
      setMessages([]);
      toast('Chat limpo', 'success');
    } catch (error) {
      console.error('Falha ao limpar chat:', error);
      toast('Falha ao limpar chat', 'error');
    }
  }, [channelId, toast]);

  return (
    <div className={cn('flex flex-col h-full bg-card border border-border rounded-2xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="size-5 text-primary" />
          <h3 className="font-semibold text-highlight">Chat</h3>
          <span className="text-xs text-text-dim bg-bg px-2 py-1 rounded-full">
            {channelId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={modelMenuRef}>
            <button
              onClick={() => setIsModelMenuOpen((open) => !open)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-dim hover:text-accent hover:bg-bg rounded-lg transition-colors border border-border"
            >
              <span className="font-semibold text-highlight">Modelos</span>
              <span className="text-[11px] text-text-dim">{selectedModelIds.length}</span>
              <ChevronDown className={cn('size-3 transition-transform', isModelMenuOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-80 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl z-50"
                >
                  <div className="px-3 py-2 border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-dim">
                    Modelos disponíveis
                  </div>
                  <div className="p-2 space-y-1">
                    {availableModelIds.length === 0 && (
                      <p className="px-2 py-2 text-xs text-text-dim">Nenhum modelo disponível no momento.</p>
                    )}

                    {availableModelIds.map((id) => {
                      const model = AVAILABLE_MODELS.find((m) => m.id === id);
                      if (!model) {
                        return null;
                      }

                      const checked = selectedModelIds.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setSelectedModelIds((current) => {
                              if (current.includes(id)) {
                                if (current.length === 1) {
                                  return current;
                                }
                                return current.filter((x) => x !== id);
                              }
                              return [...current, id];
                            });
                          }}
                          className={cn(
                            'w-full flex items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                            checked ? 'bg-primary/10 text-primary' : 'hover:bg-bg text-accent hover:text-highlight'
                          )}
                        >
                          <span className={cn(
                            'mt-0.5 flex size-4 items-center justify-center rounded border',
                            checked ? 'border-primary bg-primary/20' : 'border-border'
                          )}>
                            {checked && <Check className="size-3" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold truncate">{model.name}</span>
                            <span className="block text-[11px] text-text-dim truncate">{model.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-3 py-2 border-t border-border text-[11px] text-text-dim">
                    `ask` usa 1 modelo. `coding` usa todos os selecionados em paralelo.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleClearChat}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-dim hover:text-accent hover:bg-bg rounded-lg transition-colors"
          >
            <Trash2 className="size-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'flex gap-3',
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                message.sender === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-accent text-accent-foreground'
              )}>
                {message.sender === 'user' ? 'U' : 'AI'}
              </div>
              <div className={cn(
                'flex-1 max-w-[80%]',
                message.sender === 'user' ? 'text-right' : 'text-left'
              )}>
                <div className={cn(
                  'inline-block px-4 py-2 rounded-2xl text-sm',
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-bg text-highlight rounded-bl-sm border border-border'
                )}>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
                <div className="text-xs text-text-dim mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Streaming message */}
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">
                AI
              </div>
              <div className="flex-1 max-w-[80%]">
                <div className="inline-block px-4 py-2 rounded-2xl rounded-bl-sm text-sm bg-bg text-highlight border border-border">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-accent" />
                    <p className="whitespace-pre-wrap break-words">{streamContent}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={isLoading || isStreaming}
            className="flex-1 px-4 py-3 bg-bg border border-border rounded-xl resize-none focus:outline-none focus:border-primary/50 transition-colors text-sm text-highlight placeholder-text-dim"
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || isStreaming}
            className="flex-shrink-0 w-11 h-11 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading || isStreaming ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
