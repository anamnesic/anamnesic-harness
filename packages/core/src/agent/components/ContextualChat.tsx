'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, Bot, User, Loader2, Trash2, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { AVAILABLE_MODELS } from '../config/models';
import { apiFetch } from '../lib/api';

type TabId = string;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
}

const SCREEN_CONTEXTS: Record<string, string> = {
  dashboard: `Você é um assistente do painel operacional do Kairos. Auxilie com análise de métricas, status de agentes, pipelines e decisões operacionais. Seja objetivo e técnico.`,
  control: `Você é um especialista em segurança do Kairos. Auxilie com análise de ameaças, auditoria, políticas de acesso e hardening. Responda com rigor técnico em segurança.`,
  agents: `Você é um assistente de gerenciamento de agentes de IA do Kairos. Auxilie com configuração, criação, diagnóstico e otimização de agentes. Sugira prompts, ferramentas e estratégias de orquestração.`,
  skills: `Você é um assistente de skills do Kairos. Auxilie com criação, edição e otimização de skills de agentes de IA. Sugira boas práticas e exemplos de implementação.`,
  mcp: `Você é um especialista em servidores MCP (Model Context Protocol). Auxilie com configuração, depuração e boas práticas de uso de ferramentas MCP no Kairos.`,
  system: `Você é um assistente de configuração do motor do Kairos. Auxilie com ajustes de parâmetros do sistema, provedores de IA, modelos e configurações avançadas.`,
  email: `Você é um assistente de email do Kairos. Auxilie a redigir, resumir, responder e gerenciar emails. Sugira melhores práticas e templates quando relevante.`,
  'repo-files': `Você é um assistente de repositório de código. Auxilie com análise de arquivos, estrutura de projeto, dependências e navegação no código-fonte.`,
  'repo-context': `Você é um assistente de documentação e wiki do projeto. Auxilie com escrita de documentação, contexto do projeto e organização do conhecimento.`,
  'repo-decisions': `Você é um assistente de registro de decisões técnicas (ADR). Auxilie com documentação de decisões de arquitetura, trade-offs e histórico de escolhas técnicas.`,
  ledger: `Você é um assistente de memória do Kairos. Auxilie com análise e organização do ledger de memória dos agentes.`,
  observers: `Você é um assistente de observabilidade do Kairos. Auxilie com análise de observers, alertas e monitoramento do sistema.`,
  workflows: `Você é um especialista em workflows do Kairos. Auxilie com criação, depuração e otimização de pipelines e fluxos de trabalho automatizados.`,
  tasks: `Você é um assistente de tarefas do Kairos. Auxilie com priorização, planejamento e acompanhamento de tarefas e projetos.`,
  snapshots: `Você é um assistente de snapshots do sistema Kairos. Auxilie com análise de estado do sistema, comparação de snapshots e rollback.`,
  integrations: `Você é um especialista em integrações e webhooks do Kairos. Auxilie com configuração de conectores, depuração de chamadas e boas práticas de integração.`,
  inference: `Você é um especialista em inferência de modelos de linguagem. Auxilie com seleção de modelos, ajuste de parâmetros e análise de resultados.`,
};

const DEFAULT_CONTEXT = `Você é um assistente do Kairos, um sistema operacional de agentes de IA. Auxilie o usuário com qualquer dúvida ou tarefa relacionada ao sistema.`;

function getSystemPrompt(activeTab: TabId, screenTitle: string): string {
  const base = SCREEN_CONTEXTS[activeTab] ?? DEFAULT_CONTEXT;
  return `${base}\n\nContexto atual: tela "${screenTitle}".`;
}

function parseSseChunks(raw: string): string {
  let content = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const payload = JSON.parse(line.slice(6));
      if (payload.type === 'chunk' && payload.content) {
        content += payload.content;
      }
    } catch {
      // skip malformed
    }
  }
  return content;
}

export function ContextualChat({
  activeTab,
  screenTitle,
  open,
  onClose,
}: {
  activeTab: TabId;
  screenTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [availableModelIds, setAvailableModelIds] = useState<Set<string> | null>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch available models once on mount
  useEffect(() => {
    apiFetch<{ success: boolean; data: { models: Record<string, boolean> } }>('/api/v1/system/ai-availability')
      .then(res => {
        if (res.success && res.data?.models) {
          const ids = new Set(
            Object.entries(res.data.models)
              .filter(([, ok]) => ok)
              .map(([id]) => id)
          );
          setAvailableModelIds(ids);
          // Auto-select first available model
          const first = AVAILABLE_MODELS.find(m => ids.has(m.id));
          if (first) setSelectedModel(first.id);
        } else {
          setAvailableModelIds(new Set()); // none available
        }
      })
      .catch(() => setAvailableModelIds(new Set())); // treat error as none available
  }, []);

  // Reset messages when screen changes
  const prevTab = useRef(activeTab);
  useEffect(() => {
    if (prevTab.current !== activeTab) {
      prevTab.current = activeTab;
      setMessages([]);
    }
  }, [activeTab]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node) &&
        modelBtnRef.current && !modelBtnRef.current.contains(e.target as Node)
      ) {
        setModelMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const pendingMsg: Message = { id: assistantId, role: 'assistant', content: '', pending: true };

    setMessages(prev => [...prev, userMsg, pendingMsg]);
    setInput('');
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('kairos-token') : null;
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          channelId: `sidebar-${activeTab}`,
          modelIds: [selectedModel],
          systemPrompt: getSystemPrompt(activeTab, screenTitle),
        }),
      });

      const raw = await res.text();
      const content = parseSseChunks(raw) || '(sem resposta)';

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content, pending: false } : m)
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Erro ao conectar com o modelo. Verifique o provedor de IA.', pending: false }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeTab, screenTitle]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-bg h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-highlight">Assistente</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title="Limpar conversa"
              className="rounded-lg p-1.5 text-text-dim hover:text-highlight hover:bg-card transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-dim hover:text-highlight hover:bg-card transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Context badge */}
      <div className="border-b border-border/40 px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Contexto: </span>
        <span className="text-[10px] text-accent font-medium">{screenTitle}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-text-dim py-8">
            <Bot className="size-8 opacity-30" />
            {availableModelIds !== null && availableModelIds.size === 0 ? (
              <>
                <AlertTriangle className="size-5 text-yellow-400 opacity-70" />
                <p className="text-xs text-center opacity-70 max-w-[200px] text-yellow-400">
                  Nenhum provedor de IA disponível. Instale o Copilot CLI, Gemini CLI ou Ollama.
                </p>
              </>
            ) : (
              <p className="text-xs text-center opacity-60 max-w-[180px]">
                Pergunte qualquer coisa sobre <span className="text-accent">{screenTitle}</span>
              </p>
            )}
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="shrink-0 mt-1 flex size-5 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-3 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-card border border-border text-highlight rounded-bl-sm',
                )}
              >
                {msg.pending ? (
                  <Loader2 className="size-3.5 animate-spin text-text-dim" />
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === 'user' && (
                <div className="shrink-0 mt-1 flex size-5 items-center justify-center rounded-full bg-card border border-border">
                  <User className="size-3 text-text-dim" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Model selector */}
        <div className="relative">
          <button
            ref={modelBtnRef}
            onClick={() => {
              const rect = modelBtnRef.current?.getBoundingClientRect() ?? null;
              setMenuRect(rect);
              setModelMenuOpen(v => !v);
            }}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] hover:border-accent/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Bot className="size-3 shrink-0 text-primary" />
              <span className="truncate text-highlight font-medium">
                {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name ?? selectedModel}
              </span>
            </div>
            <ChevronDown className={cn('size-3 shrink-0 text-text-dim transition-transform', modelMenuOpen && 'rotate-180')} />
          </button>

          {modelMenuOpen && menuRect && typeof document !== 'undefined' && createPortal(
            <div
              ref={modelMenuRef}
              style={{
                position: 'fixed',
                bottom: window.innerHeight - menuRect.top + 4,
                left: menuRect.left,
                width: menuRect.width,
                zIndex: 9999,
              }}
              className="rounded-xl border border-border bg-bg shadow-2xl overflow-hidden"
            >
              {availableModelIds !== null && availableModelIds.size === 0 && (
                <div className="flex items-center gap-2 px-3 py-2.5 text-[10px] text-yellow-400 bg-yellow-500/5 border-b border-border">
                  <AlertTriangle className="size-3 shrink-0" />
                  Nenhum CLI de IA detectado
                </div>
              )}
              <div className="max-h-64 overflow-y-auto">
                {(['auto', 'recommended', 'other'] as const).map(group => {
                  const groupModels = AVAILABLE_MODELS.filter(m => m.group === group);
                  if (groupModels.length === 0) return null;
                  const labels = { auto: 'Auto', recommended: 'Recomendados', other: 'Outros' };
                  return (
                    <div key={group}>
                      <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-text-dim bg-card/50 border-b border-border/40">
                        {labels[group]}
                      </div>
                      {groupModels.map(model => {
                        const available = availableModelIds === null || availableModelIds.has(model.id);
                        return (
                          <button
                            key={model.id}
                            onClick={() => { if (available) { setSelectedModel(model.id); setModelMenuOpen(false); } }}
                            disabled={!available}
                            className={cn(
                              'w-full flex items-start gap-2 px-3 py-2 text-left transition-colors border-b border-border/20 last:border-0',
                              available ? 'hover:bg-card/60' : 'opacity-35 cursor-not-allowed',
                              selectedModel === model.id && 'bg-primary/5'
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className={cn('text-[11px] font-medium truncate', selectedModel === model.id ? 'text-primary' : available ? 'text-highlight' : 'text-text-dim')}>
                                  {model.name}
                                </p>
                                {!available && availableModelIds !== null && (
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-text-dim/60 shrink-0">indisponível</span>
                                )}
                              </div>
                              <p className="text-[9px] text-text-dim truncate">{model.description}</p>
                            </div>
                            {selectedModel === model.id && (
                              <div className="shrink-0 mt-0.5 size-1.5 rounded-full bg-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Message input */}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-primary/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mensagem... (Enter para enviar)"
            rows={1}
            className="flex-1 resize-none bg-transparent text-xs text-highlight placeholder-text-dim outline-none max-h-28"
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="shrink-0 flex size-6 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-30 hover:bg-primary/80 transition-colors"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          </button>
        </div>
        <p className="text-[9px] text-text-dim text-center">Shift+Enter para nova linha</p>
      </div>
    </aside>
  );
}
