'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Trash2, Send, Square, RotateCw, Circle, Maximize2, Minimize2 } from 'lucide-react';
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
    const [isMaximized, setIsMaximized] = useState(false);
    const [tabState, setTabState] = useState<TabStateMap>(INITIAL);
    const [inputs, setInputs] = useState<Record<CliTab, string>>({
        claude: '',
        gemini: '',
        copilot: '',
        codex: '',
    });
    const outputRefs = useRef<Partial<Record<CliTab, HTMLDivElement | null>>>({});
    // Keep SSE reader abort controllers per tab
    const sseAborts = useRef<Partial<Record<CliTab, AbortController>>>({});

    const repoPath = repository?.metadata?.localPath ?? '';

    useEffect(() => {
        for (const tab of CLI_TABS) {
            const ref = outputRefs.current[tab.id];
            if (ref) {
                ref.scrollTop = ref.scrollHeight;
            }
        }
    }, [tabState]);

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

    // Auto-connect all terminals on mount
    useEffect(() => {
        for (const tab of CLI_TABS) {
            if (tabState[tab.id].status === 'disconnected') {
                connect(tab.id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const sendInput = useCallback(async (tab: CliTab) => {
        const current = tabState[tab];
        const sid = current.sessionId;
        if (!sid || current.status !== 'running') return;
        const line = inputs[tab];
        if (!line) return;
        setInputs(prev => ({ ...prev, [tab]: '' }));
        // Echo locally
        appendOutput(tab, line + '\n');
        try {
            await fetch(`/api/terminal/sessions/${sid}/input`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ data: line + '\n' }),
            });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            appendOutput(tab, `[send error: ${msg}]\n`);
        }
    }, [tabState, inputs, appendOutput]);

    const handleKeyDown = (tab: CliTab, e: React.KeyboardEvent<HTMLInputElement>) => {
        const current = tabState[tab];
        if (e.key === 'Enter') {
            e.preventDefault();
            void sendInput(tab);
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

    const asideClass = isMaximized
        ? 'fixed inset-y-0 right-0 z-60 flex w-[76vw] min-w-[980px] flex-col border-l border-border bg-[#0a0a0a] shadow-2xl'
        : 'flex h-screen w-[46vw] min-w-xl shrink-0 flex-col border-l border-border bg-[#0a0a0a]';

    return (
        <aside className={asideClass}>
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
                <Terminal className="size-4 text-primary shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-text-dim">Terminal</span>
                <span className="text-[9px] text-text-dim/70">4 sessões simultâneas</span>
                {repoPath && (
                    <span className="ml-2 max-w-60 truncate font-mono text-[9px] text-text-dim" title={repoPath}>
                        {repoPath}
                    </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => setIsMaximized(prev => !prev)}
                        title={isMaximized ? 'Restaurar tamanho' : 'Maximizar terminal'}
                        className="text-text-dim transition-colors hover:text-accent"
                    >
                        {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                    </button>
                    <button
                        onClick={() => {
                            for (const tab of CLI_TABS) {
                                void killSession(tab.id).then(() => connect(tab.id));
                            }
                        }}
                        title="Reiniciar todas as sessões"
                        className="text-text-dim transition-colors hover:text-accent"
                    >
                        <RotateCw className="size-3.5" />
                    </button>
                    <button
                        onClick={() => {
                            setTabState(prev => ({
                                ...prev,
                                claude: { ...prev.claude, output: '' },
                                gemini: { ...prev.gemini, output: '' },
                                copilot: { ...prev.copilot, output: '' },
                                codex: { ...prev.codex, output: '' },
                            }));
                        }}
                        title="Limpar saídas"
                        className="text-text-dim transition-colors hover:text-accent"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-px bg-border">
                {CLI_TABS.map(tab => {
                    const current = tabState[tab.id];
                    return (
                        <section key={tab.id} className="flex min-h-0 flex-col bg-[#0a0a0a]">
                            <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-2 py-1.5">
                                <StatusDot status={current.status} />
                                <span className={cn('text-[10px] font-bold uppercase tracking-wider', tab.colorClass)}>{tab.label}</span>
                                <div className="ml-auto flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            if (current.status === 'exited' || current.status === 'disconnected') {
                                                void connect(tab.id);
                                            } else {
                                                void killSession(tab.id).then(() => connect(tab.id));
                                            }
                                        }}
                                        title="Reiniciar"
                                        className="text-text-dim transition-colors hover:text-accent"
                                    >
                                        <RotateCw className="size-3" />
                                    </button>
                                    <button
                                        onClick={() => setTabState(prev => ({ ...prev, [tab.id]: { ...prev[tab.id], output: '' } }))}
                                        title="Limpar"
                                        className="text-text-dim transition-colors hover:text-accent"
                                    >
                                        <Trash2 className="size-3" />
                                    </button>
                                    {current.status === 'running' && (
                                        <button
                                            onClick={() => void killSession(tab.id)}
                                            title="Encerrar"
                                            className="text-red-400 transition-colors hover:text-red-300"
                                        >
                                            <Square className="size-3" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div
                                ref={el => { outputRefs.current[tab.id] = el; }}
                                className="scrollbar-kairos min-h-0 flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-relaxed"
                            >
                                {current.output.length === 0 && current.status === 'connecting' && (
                                    <p className="italic text-text-dim">Iniciando...</p>
                                )}
                                {current.output.length === 0 && current.status === 'disconnected' && (
                                    <p className="italic text-text-dim">Desconectado</p>
                                )}
                                <pre className="whitespace-pre-wrap break-all text-green-300">{current.output}</pre>
                            </div>

                            <div className="shrink-0 border-t border-border/40 px-2 py-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className={cn('shrink-0 font-mono text-[10px] font-bold', tab.colorClass)}>›</span>
                                    <input
                                        type="text"
                                        value={inputs[tab.id]}
                                        onChange={e => setInputs(prev => ({ ...prev, [tab.id]: e.target.value }))}
                                        onKeyDown={e => handleKeyDown(tab.id, e)}
                                        disabled={current.status !== 'running'}
                                        placeholder={current.status === 'running' ? 'Comando...' : 'Offline'}
                                        className="flex-1 bg-transparent font-mono text-[10px] text-highlight placeholder:text-text-dim/40 focus:outline-none disabled:opacity-40"
                                    />
                                    <button
                                        onClick={() => void sendInput(tab.id)}
                                        disabled={current.status !== 'running' || !inputs[tab.id]}
                                        title="Enviar"
                                        className="shrink-0 text-primary transition-colors hover:text-accent disabled:opacity-30"
                                    >
                                        <Send className="size-3" />
                                    </button>
                                </div>
                            </div>
                        </section>
                    );
                })}
            </div>
        </aside>
    );
}

