'use client';

import { useState, useRef, useCallback } from 'react';
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

const CLI_TABS: { id: CliTab; label: string; colorClass: string }[] = [
  { id: 'claude', label: 'Claude', colorClass: 'text-orange-400' },
  { id: 'gemini', label: 'Gemini', colorClass: 'text-blue-400' },
  { id: 'copilot', label: 'Copilot', colorClass: 'text-purple-400' },
  { id: 'codex', label: 'Codex', colorClass: 'text-green-400' },
];

interface TerminalLine {
  type: 'input' | 'stdout' | 'stderr' | 'exit' | 'info';
  text: string;
  id: number;
}

type LinesMap = Record<CliTab, TerminalLine[]>;
type InputsMap = Record<CliTab, string>;
type RunningMap = Record<CliTab, boolean>;

const EMPTY_LINES: LinesMap = { claude: [], gemini: [], copilot: [], codex: [] };
const EMPTY_INPUTS: InputsMap = { claude: '', gemini: '', copilot: '', codex: '' };
const EMPTY_RUNNING: RunningMap = { claude: false, gemini: false, copilot: false, codex: false };
const MAX_VISIBLE_LINES = 12;

let lineId = 0;
function mkLine(type: TerminalLine['type'], text: string): TerminalLine {
  return { type, text, id: ++lineId };
}

export function TerminalPanel() {
  const { repository } = useRepository();
  const [inputs, setInputs] = useState<InputsMap>(EMPTY_INPUTS);
  const [isRunning, setIsRunning] = useState<RunningMap>(EMPTY_RUNNING);
  const [lines, setLines] = useState<LinesMap>(EMPTY_LINES);
  const abortRefs = useRef<Partial<Record<CliTab, AbortController>>>({});

  const addLine = useCallback((tab: CliTab, line: TerminalLine) => {
    setLines(prev => ({ ...prev, [tab]: [...prev[tab], line] }));
  }, []);

  const handleSubmit = useCallback(async (tab: CliTab) => {
    const prompt = inputs[tab].trim();
    if (!prompt || isRunning[tab]) return;

    const cwd = repository?.metadata?.localPath ?? '';

    addLine(tab, mkLine('input', `$ ${prompt}`));
    setInputs(prev => ({ ...prev, [tab]: '' }));
    setIsRunning(prev => ({ ...prev, [tab]: true }));

    const controller = new AbortController();
    abortRefs.current[tab] = controller;

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
      setIsRunning(prev => ({ ...prev, [tab]: false }));
      delete abortRefs.current[tab];
    }
  }, [inputs, isRunning, repository, addLine]);

  const handleKeyDown = (tab: CliTab, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(tab);
    }
  };

  const stopRunning = (tab: CliTab) => {
    abortRefs.current[tab]?.abort();
    setIsRunning(prev => ({ ...prev, [tab]: false }));
  };

  const clearTab = (tab: CliTab) => setLines(prev => ({ ...prev, [tab]: [] }));
  const clearAllTabs = () => setLines(EMPTY_LINES);

  const repoPath = repository?.metadata?.localPath;

  return (
    <aside className="flex h-screen w-[46vw] min-w-xl shrink-0 flex-col border-l border-border bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <Terminal className="size-4 text-primary shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest text-text-dim">Terminais</span>
        {repoPath && <p className="truncate font-mono text-[9px] text-text-dim">{repoPath}</p>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={clearAllTabs} title="Limpar todos" className="text-text-dim transition-colors hover:text-accent">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 p-2">
        {CLI_TABS.map(tab => {
          const tabLines = lines[tab.id].slice(-MAX_VISIBLE_LINES);
          const running = isRunning[tab.id];
          const value = inputs[tab.id];

          return (
            <section key={tab.id} className="flex min-h-0 flex-col rounded-md border border-border/70 bg-bg/60">
              <div className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5">
                <p className={cn('text-[10px] font-black uppercase tracking-wider', tab.colorClass)}>{tab.label}</p>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => clearTab(tab.id)}
                    title={`Limpar ${tab.label}`}
                    className="text-text-dim transition-colors hover:text-accent"
                  >
                    <Trash2 className="size-3" />
                  </button>
                  {running && <span className="text-[9px] text-text-dim">rodando</span>}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden px-2 py-1.5 font-mono text-[10px]">
                {tabLines.length === 0 ? (
                  <p className="italic text-text-dim">
                    {repoPath ? `Pronto - ${tab.label} CLI` : 'Selecione um repositório para definir o cwd'}
                  </p>
                ) : (
                  tabLines.map(line => (
                    <div
                      key={line.id}
                      className={cn(
                        'whitespace-pre-wrap break-all leading-relaxed',
                        line.type === 'input' ? `font-bold ${tab.colorClass}` :
                          line.type === 'stderr' ? 'text-red-400' :
                            line.type === 'exit' ? 'mt-1 text-[9px] text-text-dim' :
                              'text-green-300',
                      )}
                    >
                      {line.text}
                    </div>
                  ))
                )}
                {running && <span className="animate-pulse text-text-dim">▋</span>}
              </div>

              <div className="border-t border-border/60 px-2 py-1.5">
                <div className="flex items-end gap-1.5">
                  <span className={cn('shrink-0 font-mono text-[10px] font-bold leading-[1.3rem]', tab.colorClass)}>$</span>
                  <textarea
                    value={value}
                    onChange={e => setInputs(prev => ({ ...prev, [tab.id]: e.target.value }))}
                    onKeyDown={e => handleKeyDown(tab.id, e)}
                    disabled={running}
                    rows={2}
                    placeholder={`Prompt para ${tab.label}...`}
                    className="flex-1 resize-none rounded bg-transparent font-mono text-[10px] text-highlight placeholder:text-text-dim/50 focus:outline-none disabled:opacity-50"
                  />
                  {running ? (
                    <button
                      onClick={() => stopRunning(tab.id)}
                      title={`Parar ${tab.label}`}
                      className="mb-0.5 shrink-0 text-red-400 transition-colors hover:text-red-300"
                    >
                      <Square className="size-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleSubmit(tab.id)}
                      disabled={!value.trim()}
                      title={`Enviar para ${tab.label}`}
                      className="mb-0.5 shrink-0 text-primary transition-colors hover:text-accent disabled:opacity-30"
                    >
                      <Send className="size-3" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[8px] text-text-dim/50">Enter envia - Shift+Enter quebra</p>
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

