'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Trash2, Send, Square } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useRepository } from '@/src/context/RepositoryContext';

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra ?? {}) };
  if (typeof window === 'undefined') return headers;

  const token = localStorage.getItem('kairos-token');
  const workspaceId = localStorage.getItem('kairos-selected-workspace');
  const projectId = localStorage.getItem('kairos-selected-repository');

  if (token) headers.Authorization = `Bearer ${token}`;
  if (workspaceId) headers['X-Workspace-Id'] = workspaceId;
  if (projectId) headers['X-Project-Id'] = projectId;
  return headers;
}

type CliTab = 'claude' | 'gemini' | 'copilot' | 'codex';

const CLI_TABS: { id: CliTab; label: string; colorClass: string; activeBg: string }[] = [
  { id: 'claude', label: 'Claude', colorClass: 'text-orange-400', activeBg: 'border-orange-400/40 text-orange-400' },
  { id: 'gemini', label: 'Gemini', colorClass: 'text-blue-400', activeBg: 'border-blue-400/40 text-blue-400' },
  { id: 'copilot', label: 'Copilot', colorClass: 'text-purple-400', activeBg: 'border-purple-400/40 text-purple-400' },
  { id: 'codex', label: 'Codex', colorClass: 'text-green-400', activeBg: 'border-green-400/40 text-green-400' },
];

interface TerminalLine {
  type: 'input' | 'stdout' | 'stderr' | 'exit' | 'info';
  text: string;
  id: number;
}

type LinesMap = Record<CliTab, TerminalLine[]>;

const EMPTY_LINES: LinesMap = { claude: [], gemini: [], copilot: [], codex: [] };

let lineId = 0;
function mkLine(type: TerminalLine['type'], text: string): TerminalLine {
  return { type, text, id: ++lineId };
}

export function TerminalPanel() {
  const { repository } = useRepository();
  const [activeTab, setActiveTab] = useState<CliTab>('claude');
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lines, setLines] = useState<LinesMap>(EMPTY_LINES);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines[activeTab]]);

  // Focus input on tab switch
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeTab]);

  const addLine = useCallback((tab: CliTab, line: TerminalLine) => {
    setLines(prev => ({ ...prev, [tab]: [...prev[tab], line] }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isRunning) return;

    const prompt = input.trim();
    const tab = activeTab;
    const cwd = repository?.metadata?.localPath ?? '';

    addLine(tab, mkLine('input', `$ ${prompt}`));
    setInput('');
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/terminal/stream', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ cli: tab, prompt, cwd }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        addLine(tab, mkLine('stderr', `Erro: ${response.status} ${response.statusText}`));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(part.slice(6)) as { type: TerminalLine['type']; data: string };
            addLine(tab, mkLine(parsed.type, parsed.data));
          } catch {
            // malformed SSE chunk — ignore
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        addLine(tab, mkLine('stderr', `Erro: ${e.message}`));
      }
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [input, isRunning, activeTab, repository, addLine]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const stopRunning = () => {
    abortRef.current?.abort();
    setIsRunning(false);
  };

  const clearTab = () => setLines(prev => ({ ...prev, [activeTab]: [] }));

  const repoPath = repository?.metadata?.localPath;
  const currentLines = lines[activeTab];
  const activeTabDef = CLI_TABS.find(t => t.id === activeTab)!;

  return (
    <aside className="flex h-screen w-80 shrink-0 flex-col border-l border-border bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <Terminal className="size-4 text-primary shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest text-text-dim">Terminal</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={clearTab} title="Limpar" className="text-text-dim transition-colors hover:text-accent">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* CLI Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-border px-3 pt-2">
        {CLI_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-t-lg border border-b-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
              activeTab === tab.id
                ? `border-border bg-bg ${tab.colorClass}`
                : 'border-transparent text-text-dim hover:text-accent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Repo path badge */}
      {repoPath && (
        <div className="shrink-0 border-b border-border/40 px-3 py-1.5">
          <p className="truncate font-mono text-[9px] text-text-dim" title={repoPath}>{repoPath}</p>
        </div>
      )}

      {/* Output area */}
      <div
        ref={outputRef}
        className="scrollbar-kairos min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[11px]"
      >
        {currentLines.length === 0 && (
          <p className="italic text-text-dim">
            {repoPath ? `Pronto — ${activeTabDef.label} CLI` : 'Selecione um repositório para definir o cwd'}
          </p>
        )}
        {currentLines.map(line => (
          <div
            key={line.id}
            className={cn(
              'whitespace-pre-wrap break-all leading-relaxed',
              line.type === 'input' ? `font-bold ${activeTabDef.colorClass}` :
                line.type === 'stderr' ? 'text-red-400' :
                  line.type === 'exit' ? 'mt-1 text-[9px] text-text-dim' :
                    'text-green-300',
            )}
          >
            {line.text}
          </div>
        ))}
        {isRunning && <span className="animate-pulse text-text-dim">▋</span>}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border px-3 py-2">
        <div className="flex items-end gap-2">
          <span className={cn('shrink-0 font-mono text-xs font-bold leading-[1.6rem]', activeTabDef.colorClass)}>$</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            rows={2}
            placeholder={`Prompt para ${activeTabDef.label}…`}
            className="scrollbar-kairos flex-1 resize-none rounded bg-transparent font-mono text-[11px] text-highlight placeholder:text-text-dim/50 focus:outline-none disabled:opacity-50"
          />
          {isRunning ? (
            <button onClick={stopRunning} title="Parar" className="mb-0.5 shrink-0 text-red-400 transition-colors hover:text-red-300">
              <Square className="size-3.5" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!input.trim()} title="Enviar (Enter)" className="mb-0.5 shrink-0 text-primary transition-colors hover:text-accent disabled:opacity-30">
              <Send className="size-3.5" />
            </button>
          )}
        </div>
        <p className="mt-1 text-[9px] text-text-dim/50">Enter para enviar · Shift+Enter nova linha</p>
      </div>
    </aside>
  );
}

