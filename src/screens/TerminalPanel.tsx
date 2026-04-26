'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Trash2, Square, RotateCw, Circle, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useRepository } from '@/src/context/RepositoryContext';

type XTermType = import('xterm').Terminal;
type FitAddonType = import('@xterm/addon-fit').FitAddon;

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

interface TerminalPanelProps {
    onMaximizeChange?: (isMaximized: boolean) => void;
}

export function TerminalPanel({ onMaximizeChange }: TerminalPanelProps) {
    const { repository } = useRepository();
    const [isMaximized, setIsMaximized] = useState(false);
    const [activeTab, setActiveTab] = useState<CliTab>('claude');
    const [tabState, setTabState] = useState<TabStateMap>(INITIAL);
    const hostRefs = useRef<Partial<Record<CliTab, HTMLDivElement | null>>>({});
    const xtermRefs = useRef<Partial<Record<CliTab, XTermType>>>({});
    const fitRefs = useRef<Partial<Record<CliTab, FitAddonType>>>({});
    const writtenLengths = useRef<Record<CliTab, number>>({ claude: 0, gemini: 0, copilot: 0, codex: 0 });
    const sseAborts = useRef<Partial<Record<CliTab, AbortController>>>({});

    const repoPath = repository?.metadata?.localPath ?? '';

    const visibleTabs = isMaximized ? CLI_TABS.map(tab => tab.id) : [activeTab];

    const appendOutput = useCallback((tab: CliTab, text: string) => {
        setTabState(prev => ({
            ...prev,
            [tab]: { ...prev[tab], output: prev[tab].output + text },
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

    const connect = useCallback(async (tab: CliTab): Promise<string | null> => {
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
                return null;
            }
            const { sessionId } = await resp.json() as { sessionId: string };
            setTabState(prev => ({ ...prev, [tab]: { ...prev[tab], sessionId, status: 'running' } }));
            subscribeToSession(tab, sessionId);
            return sessionId;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            appendOutput(tab, `[Erro: ${msg}]\n`);
            setStatus(tab, 'exited');
            return null;
        }
    }, [repoPath, appendOutput, setStatus, subscribeToSession]);

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

    const sendInput = useCallback(async (tab: CliTab, data: string) => {
        const current = tabState[tab];
        let sid = current.sessionId;
        if (!data) return;

        // Start session on first keystroke so the PTY is available before interactive input.
        if (!sid || current.status !== 'running') {
            sid = await connect(tab);
        }

        if (!sid) return;
        try {
            await fetch(`/api/terminal/sessions/${sid}/input`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ data }),
            });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            appendOutput(tab, `[send error: ${msg}]\n`);
        }
    }, [tabState, appendOutput, connect]);

    const StatusDot = ({ status }: { status: SessionStatus }) => {
        if (status === 'running') return <Circle className="size-2 fill-green-500 text-green-500" />;
        if (status === 'connecting') return <Circle className="size-2 fill-yellow-500 text-yellow-500 animate-pulse" />;
        return <Circle className="size-2 fill-text-dim text-text-dim" />;
    };

    const asideClass = isMaximized
        ? 'flex h-full min-w-0 flex-1 flex-col bg-[#0a0a0a]'
        : 'flex h-full min-w-0 flex-1 flex-col bg-[#0a0a0a]';

    useEffect(() => {
        onMaximizeChange?.(isMaximized);
    }, [isMaximized, onMaximizeChange]);

    const ensureTerminal = useCallback(async (tab: CliTab) => {
        const host = hostRefs.current[tab];
        if (!host || xtermRefs.current[tab]) return;

        const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
            import('xterm'),
            import('@xterm/addon-fit'),
        ]);

        if (!hostRefs.current[tab] || xtermRefs.current[tab]) return;

        const fitAddon = new FitAddon();
        const term = new XTerm({
            convertEol: false,
            cursorBlink: true,
            cursorStyle: 'bar',
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: isMaximized ? 12 : 13,
            scrollback: 5000,
            theme: {
                background: '#0a0a0a',
                foreground: '#d4d4d8',
                cursor: '#ec5b13',
                black: '#09090b',
                brightBlack: '#52525b',
                green: '#4ade80',
                brightGreen: '#86efac',
                red: '#f87171',
                brightRed: '#fca5a5',
                yellow: '#facc15',
                blue: '#60a5fa',
                magenta: '#c084fc',
                cyan: '#22d3ee',
                white: '#f4f4f5',
            },
        });

        term.loadAddon(fitAddon);
        term.open(host);
        fitAddon.fit();
        term.write(tabState[tab].output);
        writtenLengths.current[tab] = tabState[tab].output.length;
        term.onData((data) => {
            void sendInput(tab, data);
        });
        xtermRefs.current[tab] = term;
        fitRefs.current[tab] = fitAddon;
    }, [isMaximized, sendInput, tabState]);

    useEffect(() => {
        const visible = new Set<CliTab>(visibleTabs);
        for (const tab of CLI_TABS.map(item => item.id)) {
            if (!visible.has(tab) && xtermRefs.current[tab]) {
                xtermRefs.current[tab]?.dispose();
                delete xtermRefs.current[tab];
                delete fitRefs.current[tab];
                writtenLengths.current[tab] = 0;
            }
        }

        for (const tab of visibleTabs) {
            void ensureTerminal(tab);
        }
    }, [visibleTabs, ensureTerminal]);

    useEffect(() => {
        for (const tab of visibleTabs) {
            const term = xtermRefs.current[tab];
            if (!term) continue;
            const next = tabState[tab].output;
            const written = writtenLengths.current[tab];
            if (next.length < written) {
                term.clear();
                term.write(next);
                writtenLengths.current[tab] = next.length;
                continue;
            }
            if (next.length > written) {
                term.write(next.slice(written));
                writtenLengths.current[tab] = next.length;
            }
        }
    }, [tabState, visibleTabs]);

    useEffect(() => {
        const fitVisible = () => {
            for (const tab of visibleTabs) {
                fitRefs.current[tab]?.fit();
            }
        };

        const timer = window.setTimeout(fitVisible, 50);
        window.addEventListener('resize', fitVisible);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', fitVisible);
        };
    }, [visibleTabs, isMaximized, activeTab]);

    useEffect(() => {
        xtermRefs.current[activeTab]?.focus();
    }, [activeTab, isMaximized]);

    const activeDef = CLI_TABS.find(t => t.id === activeTab)!;
    const activeState = tabState[activeTab];

    return (
        <aside className={asideClass}>
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
                <Terminal className="size-4 text-primary shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-text-dim">Terminal</span>
                <span className="text-[9px] text-text-dim/70">terminal real PTY</span>
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

            {isMaximized ? (
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

                                <div className="min-h-0 flex-1 p-2">
                                    <div
                                        ref={el => { hostRefs.current[tab.id] = el; }}
                                        onClick={() => xtermRefs.current[tab.id]?.focus()}
                                        className="terminal-host h-full w-full overflow-hidden rounded border border-border/20"
                                    />
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
                <>
                    <div className="flex shrink-0 gap-1 border-b border-border px-3 pt-2">
                        {CLI_TABS.map(tab => {
                            const ts = tabState[tab.id];
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
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

                    <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-3 py-1.5">
                        <StatusDot status={activeState.status} />
                        <span className="text-[9px] text-text-dim">
                            {activeState.status === 'connecting' ? 'conectando…' :
                                activeState.status === 'running' ? `${activeDef.label} ativo` :
                                    activeState.status === 'exited' ? 'processo encerrado' :
                                        'desconectado'}
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                            <button
                                onClick={() => {
                                    if (activeState.status === 'disconnected' || activeState.status === 'exited') {
                                        void connect(activeTab);
                                    } else {
                                        void killSession(activeTab).then(() => connect(activeTab));
                                    }
                                }}
                                title="Reiniciar"
                                className="text-text-dim transition-colors hover:text-accent"
                            >
                                <RotateCw className="size-3" />
                            </button>
                            <button
                                onClick={() => setTabState(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], output: '' } }))}
                                title="Limpar"
                                className="text-text-dim transition-colors hover:text-accent"
                            >
                                <Trash2 className="size-3" />
                            </button>
                            {activeState.status === 'running' && (
                                <button
                                    onClick={() => void killSession(activeTab)}
                                    title="Encerrar"
                                    className="text-red-400 transition-colors hover:text-red-300"
                                >
                                    <Square className="size-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 p-3">
                        <div
                            ref={el => { hostRefs.current[activeTab] = el; }}
                            onClick={() => xtermRefs.current[activeTab]?.focus()}
                            className="terminal-host h-full w-full overflow-hidden rounded-xl border border-border/30"
                        />
                    </div>

                    <div className="shrink-0 border-t border-border/40 px-3 py-2">
                        <p className="text-[10px] text-text-dim/60">Clique no terminal e digite diretamente. Ctrl+C interrompe, Enter envia, e a autenticação roda na própria UI da ferramenta.</p>
                    </div>
                </>
            )}
        </aside>
    );
}

