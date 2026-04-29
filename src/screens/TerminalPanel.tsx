'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Square, RotateCw, Circle, Maximize2, Minimize2, Send, LayoutGrid, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useRepository } from '@/src/context/RepositoryContext';
import { useToast } from '@/src/components/Toast';

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

type CliTab = 'shell' | 'claude' | 'gemini' | 'copilot' | 'codex' | 'opencode';

const CLI_TABS: { id: CliTab; label: string; colorClass: string }[] = [
    { id: 'shell', label: 'Shell', colorClass: 'text-emerald-400' },
    { id: 'claude', label: 'Claude', colorClass: 'text-stone-200' },
    { id: 'gemini', label: 'Gemini', colorClass: 'text-blue-400' },
    { id: 'copilot', label: 'Copilot', colorClass: 'text-purple-400' },
    { id: 'codex', label: 'Codex', colorClass: 'text-green-400' },
    { id: 'opencode', label: 'OpenCode', colorClass: 'text-amber-400' },
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
    shell: initialTabState(),
    claude: initialTabState(),
    gemini: initialTabState(),
    copilot: initialTabState(),
    codex: initialTabState(),
    opencode: initialTabState(),
};

interface TerminalPanelProps {
    onMaximizeChange?: (isMaximized: boolean) => void;
    onHeaderStateChange?: (state: {
        repoPath: string;
        isMaximized: boolean;
        onToggleMaximize: () => void;
        onRestartAll: () => void;
        onClearAll: () => void;
    }) => void;
}

export function TerminalPanel({ onMaximizeChange, onHeaderStateChange }: TerminalPanelProps) {
    const { repository } = useRepository();
    const { toast } = useToast();
    const [isMaximized, setIsMaximized] = useState(false);
    const [activeTab, setActiveTab] = useState<CliTab>('shell');
    const [tabState, setTabState] = useState<TabStateMap>(INITIAL);
    
    // Estado para múltiplas instâncias por agente
    const [agentInstances, setAgentInstances] = useState<Record<CliTab, string[]>>({
        shell: ['inst-1'],
        claude: ['inst-1'],
        gemini: ['inst-1'],
        copilot: ['inst-1'],
        codex: ['inst-1'],
        opencode: ['inst-1'],
    });
    const [activeInstance, setActiveInstance] = useState<Record<CliTab, string>>({
        shell: 'inst-1',
        claude: 'inst-1',
        gemini: 'inst-1',
        copilot: 'inst-1',
        codex: 'inst-1',
        opencode: 'inst-1',
    });
    
    const [gridLayout, setGridLayout] = useState({
        shell: { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
        claude: { col: 2, row: 1, colSpan: 1, rowSpan: 1 },
        gemini: { col: 1, row: 2, colSpan: 1, rowSpan: 1 },
        copilot: { col: 2, row: 2, colSpan: 1, rowSpan: 1 },
        codex: { col: 3, row: 1, colSpan: 1, rowSpan: 1 },
        opencode: { col: 3, row: 2, colSpan: 1, rowSpan: 1 },
    });
    const [resizingTab, setResizingTab] = useState<CliTab | null>(null);
    const tabStateRef = useRef<TabStateMap>(INITIAL);
    useEffect(() => { tabStateRef.current = tabState; }, [tabState]);
    const [promptInput, setPromptInput] = useState<Record<CliTab, string>>({ shell: '', claude: '', gemini: '', copilot: '', codex: '', opencode: '' });
    const [promptStreaming, setPromptStreaming] = useState<Record<CliTab, boolean>>({ shell: false, claude: false, gemini: false, copilot: false, codex: false, opencode: false });
    const hostRefs = useRef<Record<CliTab, HTMLDivElement | null>>({ shell: null, claude: null, gemini: null, copilot: null, codex: null, opencode: null });
    const xtermRefs = useRef<Record<CliTab, XTermType | null>>({ shell: null, claude: null, gemini: null, copilot: null, codex: null, opencode: null });
    const fitRefs = useRef<Record<CliTab, FitAddonType | null>>({ shell: null, claude: null, gemini: null, copilot: null, codex: null, opencode: null });
    const resizeObservers = useRef<Record<CliTab, ResizeObserver | null>>({ shell: null, claude: null, gemini: null, copilot: null, codex: null, opencode: null });
    const writtenLengths = useRef<Record<CliTab, number>>({ shell: 0, claude: 0, gemini: 0, copilot: 0, codex: 0, opencode: 0 });
    const sseAborts = useRef<Record<CliTab, AbortController | undefined>>({ shell: undefined, claude: undefined, gemini: undefined, copilot: undefined, codex: undefined, opencode: undefined });
    const promptAborts = useRef<Record<CliTab, AbortController | undefined>>({ shell: undefined, claude: undefined, gemini: undefined, copilot: undefined, codex: undefined, opencode: undefined });

    const repoPath = repository?.metadata?.localPath ?? '';

    // Função para criar nova instância do agente atual
    const addInstance = useCallback(() => {
        const newInstanceId = `inst-${Date.now()}`;
        setAgentInstances(prev => ({
            ...prev,
            [activeTab]: [...prev[activeTab], newInstanceId],
        }));
        setActiveInstance(prev => ({
            ...prev,
            [activeTab]: newInstanceId,
        }));
    }, [activeTab]);

    // Função para remover uma instância
    const removeInstance = useCallback((instanceId: string) => {
        setAgentInstances(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].filter(id => id !== instanceId),
        }));
        if (activeInstance[activeTab] === instanceId) {
            const remaining = agentInstances[activeTab].filter(id => id !== instanceId);
            setActiveInstance(prev => ({
                ...prev,
                [activeTab]: remaining[0] || null,
            }));
        }
    }, [activeTab, activeInstance, agentInstances]);

    // Quando maximizado, mostra apenas o agente ativo (para suportar múltiplas instâncias do mesmo agente)
    const visibleTabs = isMaximized ? [activeTab] : [activeTab];

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

    const sendResize = useCallback(async (tab: CliTab, cols: number, rows: number) => {
        const sid = tabState[tab].sessionId;
        if (!sid) return;
        try {
            await fetch(`/api/terminal/sessions/${sid}/resize`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ cols, rows }),
            });
        } catch { /* ignore */ }
    }, [tabState]);

    const connect = useCallback(async (tab: CliTab): Promise<string | null> => {
        setStatus(tab, 'connecting');
        setTabState(prev => ({ ...prev, [tab]: { ...prev[tab], output: '', sessionId: null, status: 'connecting' } }));

        try {
            const term = xtermRefs.current[tab];
            const cols = term?.cols ?? 120;
            const rows = term?.rows ?? 30;
            const resp = await fetch('/api/terminal/sessions', {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ cli: tab, cwd: repoPath, cols, rows }),
            });
            if (!resp.ok) {
                const raw = await resp.text();
                // Se o servidor devolver HTML (ex.: página de erro do Next), não polui o xterm com o documento inteiro.
                const isHtml = /^\s*<(?:!doctype|html|head|body)/i.test(raw);
                const msg = isHtml ? `HTTP ${resp.status} (resposta HTML do servidor — veja o log do Next)` : raw.slice(0, 1000);
                appendOutput(tab, `\x1b[31m[Erro ao iniciar sessão: ${msg}]\x1b[0m\n`);
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
        const current = tabStateRef.current[tab];
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
    }, [appendOutput, connect]);
    const sendInputRef = useRef(sendInput);
    useEffect(() => { sendInputRef.current = sendInput; }, [sendInput]);

    const streamPrompt = useCallback(async (tab: CliTab) => {
        const prompt = promptInput[tab]?.trim();
        if (!prompt || promptStreaming[tab]) return;

        promptAborts.current[tab]?.abort();
        const abort = new AbortController();
        promptAborts.current[tab] = abort;

        setPromptStreaming(prev => ({ ...prev, [tab]: true }));
        setPromptInput(prev => ({ ...prev, [tab]: '' }));
        appendOutput(tab, `\x1b[2m[prompt stream: ${prompt}]\x1b[0m\n`);

        let completedSuccessfully = false;

        try {
            const resp = await fetch('/api/terminal/stream', {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ cli: tab, prompt, cwd: repoPath }),
                signal: abort.signal,
            });

            if (!resp.ok || !resp.body) {
                const body = await resp.text();
                appendOutput(tab, `\x1b[31m[stream error ${resp.status}] ${body}\x1b[0m\n`);
                return;
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const chunks = buffer.split('\n\n');
                buffer = chunks.pop() ?? '';

                for (const chunk of chunks) {
                    if (!chunk.startsWith('data: ')) continue;
                    try {
                        const evt = JSON.parse(chunk.slice(6)) as { type?: 'stdout' | 'stderr' | 'exit'; data?: string };
                        const text = typeof evt.data === 'string' ? evt.data : '';
                        if (!text) continue;
                        if (evt.type === 'stderr') {
                            appendOutput(tab, `\x1b[31m${text}\x1b[0m`);
                        } else if (evt.type === 'exit') {
                            appendOutput(tab, `\x1b[2m${text}\x1b[0m\n`);
                        } else {
                            appendOutput(tab, text);
                        }
                    } catch {
                        // ignore malformed events
                    }
                }
            }
            completedSuccessfully = true;
        } catch (e: unknown) {
            if (e instanceof Error && e.name === 'AbortError') return;
            const msg = e instanceof Error ? e.message : String(e);
            appendOutput(tab, `\x1b[31m[stream failed] ${msg}\x1b[0m\n`);
        } finally {
            setPromptStreaming(prev => ({ ...prev, [tab]: false }));
            promptAborts.current[tab] = undefined;
            // Notificação quando o prompt terminar com sucesso
            if (completedSuccessfully) {
                const tabDef = CLI_TABS.find(t => t.id === tab);
                toast(`${tabDef?.label || tab} - Prompt concluído`, 'success');
            }
        }
    }, [appendOutput, promptInput, promptStreaming, repoPath, toast]);

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

    // Auto-connect: tenta conectar cada aba UMA vez quando há repoPath.
    // Se a CLI não existir no host, a aba fica 'exited' com a mensagem de erro
    // e não tenta reconectar sozinha (evita spam de 500). O usuário pode reiniciar
    // manualmente clicando no ícone ↻ da aba.
    const autoConnectedRef = useRef<Set<CliTab>>(new Set());
    useEffect(() => {
        if (!repoPath) return;
        for (const tab of CLI_TABS) {
            if (autoConnectedRef.current.has(tab.id)) continue;
            if (tabStateRef.current[tab.id].status !== 'disconnected') continue;
            autoConnectedRef.current.add(tab.id);
            void connect(tab.id);
        }
    }, [repoPath, connect]);

    useEffect(() => {
        onHeaderStateChange?.({
            repoPath,
            isMaximized,
            onToggleMaximize: () => setIsMaximized(prev => !prev),
            onRestartAll: () => {
                for (const tab of CLI_TABS) {
                    // Só reinicia abas que já foram conectadas alguma vez (running/exited).
                    // Evita spam de 500 em CLIs cujo binário não existe no host.
                    const st = tabStateRef.current[tab.id].status;
                    if (tab.id === 'shell' || st === 'running' || st === 'exited') {
                        void killSession(tab.id).then(() => connect(tab.id));
                    }
                }
            },
            onClearAll: () => {
                setTabState(prev => ({
                    ...prev,
                    shell: { ...prev.shell, output: '' },
                    claude: { ...prev.claude, output: '' },
                    gemini: { ...prev.gemini, output: '' },
                    copilot: { ...prev.copilot, output: '' },
                    codex: { ...prev.codex, output: '' },
                    opencode: { ...prev.opencode, output: '' },
                }));
            },
        });
    }, [repoPath, isMaximized, killSession, connect, onHeaderStateChange]);

    const handleResizeStart = useCallback((tab: CliTab, direction: 'horizontal' | 'vertical' | 'diagonal', event: React.MouseEvent) => {
        setResizingTab(tab);
        const startLayout = { ...gridLayout[tab] };
        const startMouseX = event.clientX;
        const startMouseY = event.clientY;
        const container = document.querySelector('.terminal-grid-container') as HTMLElement;
        
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const cellWidth = rect.width / 3; // 3 columns
        const cellHeight = rect.height / 2; // 2 rows
        
        // Add visual feedback
        document.body.style.cursor = direction === 'horizontal' ? 'ew-resize' : 
                                    direction === 'vertical' ? 'ns-resize' : 'nwse-resize';
        document.body.style.userSelect = 'none';
        
        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            
            const deltaX = e.clientX - startMouseX;
            const deltaY = e.clientY - startMouseY;
            
            let newColSpan = startLayout.colSpan;
            let newRowSpan = startLayout.rowSpan;
            let newCol = startLayout.col;
            let newRow = startLayout.row;
            
            // Calculate new spans based on drag distance
            if (direction === 'horizontal' || direction === 'diagonal') {
                const horizontalCells = Math.round(deltaX / cellWidth);
                newColSpan = Math.max(1, Math.min(3, startLayout.colSpan + horizontalCells));
            }
            
            if (direction === 'vertical' || direction === 'diagonal') {
                const verticalCells = Math.round(deltaY / cellHeight);
                newRowSpan = Math.max(1, Math.min(2, startLayout.rowSpan + verticalCells));
            }
            
            // Adjust position if needed to stay within bounds
            if (newCol + newColSpan - 1 > 3) {
                newCol = Math.max(1, 3 - newColSpan + 1);
            }
            if (newRow + newRowSpan - 1 > 2) {
                newRow = Math.max(1, 2 - newRowSpan + 1);
            }
            
            // Apply new layout with smooth transition
            setGridLayout(prev => ({
                ...prev,
                [tab]: {
                    ...prev[tab],
                    col: newCol,
                    row: newRow,
                    colSpan: newColSpan,
                    rowSpan: newRowSpan,
                }
            }));
        };
        
        const handleMouseUp = () => {
            setResizingTab(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [gridLayout]);

    const resetLayout = useCallback(() => {
        setGridLayout({
            shell: { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
            claude: { col: 2, row: 1, colSpan: 1, rowSpan: 1 },
            gemini: { col: 1, row: 2, colSpan: 1, rowSpan: 1 },
            copilot: { col: 2, row: 2, colSpan: 1, rowSpan: 1 },
            codex: { col: 3, row: 1, colSpan: 1, rowSpan: 1 },
            opencode: { col: 3, row: 2, colSpan: 1, rowSpan: 1 },
        });
    }, []);

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
        try { fitAddon.fit(); } catch { /* ignore */ }
        const initial = tabStateRef.current[tab].output;
        term.write(initial);
        writtenLengths.current[tab] = initial.length;
        term.onData((data) => {
            void sendInputRef.current(tab, data);
        });
        xtermRefs.current[tab] = term;
        fitRefs.current[tab] = fitAddon;

        // Sincroniza o tamanho do PTY com o xterm real assim que ele é medido.
        // Sem isso o shell desenha em 120 colunas mas o terminal mostra menos → quebra de linha bugada.
        void sendResize(tab, term.cols, term.rows);

        // ResizeObserver: cada vez que o host mudar de tamanho, refit + resize do PTY.
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                try { fitAddon.fit(); } catch { /* ignore */ }
                void sendResize(tab, term.cols, term.rows);
            });
            ro.observe(host);
            resizeObservers.current[tab] = ro;
        }
    }, [isMaximized, sendResize]);

    useEffect(() => {
        const visible = new Set<CliTab>(visibleTabs);
        for (const tab of CLI_TABS.map(item => item.id)) {
            if (!visible.has(tab) && xtermRefs.current[tab]) {
                resizeObservers.current[tab]?.disconnect();
                delete resizeObservers.current[tab];
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
                const fit = fitRefs.current[tab];
                const term = xtermRefs.current[tab];
                if (!fit || !term) continue;
                try { fit.fit(); } catch { /* ignore */ }
                void sendResize(tab, term.cols, term.rows);
            }
        };

        const timer = window.setTimeout(fitVisible, 50);
        window.addEventListener('resize', fitVisible);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', fitVisible);
        };
    }, [visibleTabs, isMaximized, activeTab, sendResize, tabState]);

    useEffect(() => {
        xtermRefs.current[activeTab]?.focus();
    }, [activeTab, isMaximized]);

    const activeDef = CLI_TABS.find(t => t.id === activeTab)!;
    const activeState = tabState[activeTab];

    return (
        <aside className={asideClass}>
            {isMaximized ? (
                <>
                    <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-3 py-2 bg-[#0a0a0a]">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="size-4 text-accent" />
                            <span className="text-xs font-medium text-highlight">{activeDef.label} - {agentInstances[activeTab].length} instância(s)</span>
                            <span className="text-[10px] text-text-dim/60">Múltiplos chats do mesmo agente</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={addInstance}
                                title="Adicionar nova instância"
                                className="flex items-center gap-1.5 rounded-md border border-border/40 px-2 py-1 text-[10px] text-text-dim transition-colors hover:border-accent hover:text-accent"
                            >
                                <span className="text-xs font-bold">+</span>
                                Nova
                            </button>
                            <button
                                onClick={() => setIsMaximized(false)}
                                title="Fechar split view"
                                className="flex items-center gap-1.5 rounded-md border border-border/40 px-2 py-1 text-[10px] text-text-dim transition-colors hover:border-accent hover:text-accent"
                            >
                                <Minimize2 className="size-3" />
                                Fechar
                            </button>
                        </div>
                    </div>
                    <div className="terminal-grid-container grid min-h-0 flex-1 gap-px bg-border relative" style={{
                        gridTemplateColumns: `repeat(${Math.min(agentInstances[activeTab].length, 3)}, 1fr)`,
                        gridTemplateRows: `repeat(${Math.ceil(agentInstances[activeTab].length / 3)}, 1fr)`,
                    }}>
                    {agentInstances[activeTab].map((instanceId, index) => {
                        const current = tabState[activeTab];
                        const col = (index % 3) + 1;
                        const row = Math.floor(index / 3) + 1;
                        return (
                            <section 
                                key={instanceId} 
                                className={cn(
                                    "flex min-h-0 flex-col bg-[#0a0a0a relative transition-all duration-200 ease-in-out",
                                    activeInstance[activeTab] === instanceId && "ring-2 ring-accent"
                                )}
                                style={{
                                    gridColumn: `${col} / span 1`,
                                    gridRow: `${row} / span 1`,
                                }}
                            >
                                <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-2 py-1.5">
                                    <StatusDot status={current.status} />
                                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', activeDef.colorClass)}>{activeDef.label} #{index + 1}</span>
                                    <div className="ml-auto flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                if (current.status === 'exited' || current.status === 'disconnected') {
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
                                        {current.status === 'running' && (
                                            <button
                                                onClick={() => void killSession(activeTab)}
                                                title="Encerrar"
                                                className="text-red-400 transition-colors hover:text-red-300"
                                            >
                                                <Square className="size-3" />
                                            </button>
                                        )}
                                        {agentInstances[activeTab].length > 1 && (
                                            <button
                                                onClick={() => removeInstance(instanceId)}
                                                title="Remover instância"
                                                className="text-red-400 transition-colors hover:text-red-300"
                                            >
                                                <X className="size-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="min-h-0 flex-1 p-2 relative">
                                    <div
                                        ref={el => { hostRefs.current[activeTab] = el; }}
                                        onClick={() => xtermRefs.current[activeTab]?.focus()}
                                        className="terminal-host h-full w-full overflow-hidden rounded border border-border/20"
                                    />
                                </div>
                            </section>
                        );
                    })}
                    </div>
                </>
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
                                onClick={() => setIsMaximized(prev => !prev)}
                                title={isMaximized ? "Visualização única" : "Dividir tela (ver todos os chats)"}
                                className={cn(
                                    "text-text-dim transition-colors hover:text-accent",
                                    isMaximized && "text-accent"
                                )}
                            >
                                <LayoutGrid className="size-5" />
                            </button>
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
                                <RotateCw className="size-5" />
                            </button>
                            <button
                                onClick={() => setTabState(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], output: '' } }))}
                                title="Limpar"
                                className="text-text-dim transition-colors hover:text-accent"
                            >
                                <Trash2 className="size-5" />
                            </button>
                            {activeState.status === 'running' && (
                                <button
                                    onClick={() => void killSession(activeTab)}
                                    title="Encerrar"
                                    className="text-red-400 transition-colors hover:text-red-300"
                                >
                                    <Square className="size-5" />
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

                </>
            )}

        </aside>
    );
}

