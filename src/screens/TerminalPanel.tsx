'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Trash2, Send, Square, RotateCw, Circle } from 'lucide-react';
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

/** Strip ANSI escape codes for rendering in plain HTML */
function stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*[mGKHF]/g, '');
}

type SessionStatus = 'disconnected' | 'connecting' | 'running' | 'exited';

interface TabState {
    sessionId: string | null;
    status: SessionStatus;
    output: string; // raw text buffer
}

type TabStateMap = Record<CliTab, TabState>;

const initialTabState = (): TabState => ({ sessionId: null, status: 'disconnected', output: '' });
const INITIAL: TabStateMap = {
    claude: initialTabState(),
    gemini: initialTabState(),
    copilot: initialTabState(),
    codex: initialTabState(),
};

export function TerminalPanel() {
    const { repository } = useRepository();
    const [activeTab, setActiveTab] = useState<CliTab>('claude');
    const [tabState, setTabState] = useState<TabStateMap>(INITIAL);
    const [input, setInput] = useState('');
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Keep SSE reader abort controllers per tab
    const sseAborts = useRef<Partial<Record<CliTab, AbortController>>>({});

    const repoPath = repository?.metadata?.localPath ?? '';
    const current = tabState[activeTab];
    const activeTabDef = CLI_TABS.find(t => t.id === activeTab)!;

    // Auto-scroll on output change
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [tabState[activeTab].output]);

    // Focus input when tab changes
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [activeTab]);

    const appendOutput = useCallback((tab: CliTab, text: string) => {
        setTabState(prev => ({
            ...prev,
            [tab]: { ...prev[tab], output: prev[tab].output + stripAnsi(text) },
        }));
    }, []);

    const setStatus = useCallback((tab: CliTab, status: SessionStatus) => {
        setTabState(prev => ({ ...prev, [tab]: { ...prev[tab], status } }));
    }, []);

    const subscribeToSession = useCallback((tab: CliTab, sessionId: string) => {
        // Cancel any existing SSE for this tab
        sseAborts.current[tab]?.abort();
        const abort = new AbortController();
        sseAborts.current[tab] = abort;

        (async () => {
            try {
                const resp = await fetch(`/api/terminal/sessions/${sessionId}`, {
                    headers: getAuthHeaders(),
                    signal: abort.signal,
                });
                if (!resp.ok || !resp.body) {
                    appendOutput(tab, `\n[SSE error ${resp.status}]\n`);
                    setStatus(tab, 'exited');
                    return;
                }
                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let buf = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) { setStatus(tab, 'exited'); break; }
                    buf += decoder.decode(value, { stream: true });
                    const parts = buf.split('\n\n');
                    buf = parts.pop() ?? '';
                    for (const part of parts) {
                        if (!part.startsWith('data: ')) continue;
                        try {
                            const parsed = JSON.parse(part.slice(6)) as { text: string };
                            appendOutput(tab, parsed.text);
                        } catch { /* ignore */ }
                    }
                }
            } catch (e: unknown) {
                if (e instanceof Error && e.name !== 'AbortError') {
                    appendOutput(tab, `\n[connection error: ${e.message}]\n`);
                    setStatus(tab, 'exited');
                }
            }
        })();
    }, [appendOutput, setStatus]);

    const connect = useCallback(async (tab: CliTab) => {
        setStatus(tab, 'connecting');
        setTabState(prev => ({ ...prev, [tab]: { ...prev[tab], output: '', sessionId: null, status: 'connecting' } }));

        try {
            const resp = await fetch('/api/terminal/sessions', {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ cli: tab, cwd: repoPath }),
            });
            if (!resp.ok) {
                const body = await resp.text();
                appendOutput(tab, `[Erro ao iniciar sessão: ${body}]\n`);
                setStatus(tab, 'exited');
                return;
            }
            const { sessionId } = await resp.json() as { sessionId: string };
            setTabState(prev => ({ ...prev, [tab]: { ...prev[tab], sessionId, status: 'running' } }));
            subscribeToSession(tab, sessionId);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            appendOutput(tab, `[Erro: ${msg}]\n`);
            setStatus(tab, 'exited');
        }
    }, [repoPath, appendOutput, setStatus, subscribeToSession]);

    // Auto-connect when switching to a disconnected tab
    useEffect(() => {
        if (tabState[activeTab].status === 'disconnected') {
            connect(activeTab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const killSession = useCallback(async (tab: CliTab) => {
        const sid = tabState[tab].sessionId;
        sseAborts.current[tab]?.abort();
        if (sid) {
            try {
                await fetch(`/api/terminal/sessions/${sid}`, { method: 'DELETE', headers: getAuthHeaders() });
            } catch { /* ignore */ }
        }
        setTabState(prev => ({ ...prev, [tab]: initialTabState() }));
    }, [tabState]);

    const sendInput = useCallback(async () => {
        const sid = current.sessionId;
        if (!sid || current.status !== 'running') return;
        const line = input;
        setInput('');
        // Echo locally
        appendOutput(activeTab, line + '\n');
        try {
            await fetch(`/api/terminal/sessions/${sid}/input`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ data: line + '\n' }),
            });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            appendOutput(activeTab, `[send error: ${msg}]\n`);
        }
    }, [current, input, activeTab, appendOutput]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendInput();
        }
        // Ctrl+C
        if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            const sid = current.sessionId;
            if (sid) {
                fetch(`/api/terminal/sessions/${sid}/input`, {
                    method: 'POST',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ data: '\x03' }),
                }).catch(() => { /* ignore */ });
            }
        }
    };

    const StatusDot = ({ status }: { status: SessionStatus }) => {
        if (status === 'running') return <Circle className="size-2 fill-green-500 text-green-500" />;
        if (status === 'connecting') return <Circle className="size-2 fill-yellow-500 text-yellow-500 animate-pulse" />;
        return <Circle className="size-2 fill-text-dim text-text-dim" />;
    };

    return (
        <aside className="flex h-screen w-80 shrink-0 flex-col border-l border-border bg-[#0a0a0a]">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
                <Terminal className="size-4 text-primary shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-text-dim">Terminal</span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => killSession(activeTab).then(() => connect(activeTab))}
                        title="Reiniciar sessão"
                        className="text-text-dim transition-colors hover:text-accent"
                    >
                        <RotateCw className="size-3.5" />
                    </button>
                    <button
                        onClick={() => setTabState(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], output: '' } }))}
                        title="Limpar saída"
                        className="text-text-dim transition-colors hover:text-accent"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                    {current.status === 'running' && (
                        <button
                            onClick={() => killSession(activeTab)}
                            title="Encerrar processo"
                            className="text-red-400 transition-colors hover:text-red-300"
                        >
                            <Square className="size-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* CLI Tabs */}
            <div className="flex shrink-0 gap-1 border-b border-border px-3 pt-2">
                {CLI_TABS.map(tab => {
                    const ts = tabState[tab.id];
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (ts.status === 'disconnected' || ts.status === 'exited') {
                                    connect(tab.id);
                                }
                            }}
                            className={cn(
                                'relative rounded-t-lg border border-b-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                                activeTab === tab.id
                                    ? `border-border bg-bg ${tab.colorClass}`
                                    : 'border-transparent text-text-dim hover:text-accent',
                            )}
                        >
                            {tab.label}
                            {ts.status === 'running' && (
                                <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-green-500" />
                            )}
                            {ts.status === 'connecting' && (
                                <span className="absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-yellow-500" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Session info bar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-3 py-1.5">
                <StatusDot status={current.status} />
                <span className="text-[9px] text-text-dim">
                    {current.status === 'connecting' ? 'conectando…' :
                        current.status === 'running' ? `${activeTabDef.label} ativo` :
                            current.status === 'exited' ? 'processo encerrado' :
                                'desconectado'}
                </span>
                {repoPath && (
                    <span className="ml-auto max-w-35 truncate font-mono text-[9px] text-text-dim" title={repoPath}>
                        {repoPath.split(/[\\/]/).slice(-2).join('/')}
                    </span>
                )}
            </div>

            {/* Output area */}
            <div
                ref={outputRef}
                className="scrollbar-kairos min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed"
            >
                {current.output.length === 0 && current.status === 'connecting' && (
                    <p className="italic text-text-dim">Iniciando {activeTabDef.label}…</p>
                )}
                {current.output.length === 0 && current.status === 'disconnected' && (
                    <p className="italic text-text-dim">Pressione Enter para conectar</p>
                )}
                <pre className="whitespace-pre-wrap break-all text-green-300">{current.output}</pre>
                {current.status === 'exited' && (
                    <button
                        onClick={() => connect(activeTab)}
                        className={cn('mt-2 text-[10px] font-bold underline', activeTabDef.colorClass)}
                    >
                        Reiniciar sessão
                    </button>
                )}
            </div>

            {/* Input row */}
            <div className="shrink-0 border-t border-border px-3 py-2">
                <div className="flex items-center gap-2">
                    <span className={cn('shrink-0 font-mono text-xs font-bold', activeTabDef.colorClass)}>›</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={current.status !== 'running'}
                        placeholder={
                            current.status === 'running' ? `Enviar para ${activeTabDef.label}…` :
                                current.status === 'connecting' ? 'Aguardando processo…' :
                                    'Processo encerrado'
                        }
                        className="flex-1 bg-transparent font-mono text-[11px] text-highlight placeholder:text-text-dim/40 focus:outline-none disabled:opacity-40"
                    />
                    <button
                        onClick={sendInput}
                        disabled={current.status !== 'running' || !input}
                        title="Enviar"
                        className="shrink-0 text-primary transition-colors hover:text-accent disabled:opacity-30"
                    >
                        <Send className="size-3.5" />
                    </button>
                </div>
                <p className="mt-1 text-[9px] text-text-dim/40">Enter envia · Ctrl+C interrompe</p>
            </div>
        </aside>
    );
}

