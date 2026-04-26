'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2, Send } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useRepository } from '@/src/context/RepositoryContext';

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

const EMPTY_LINES: LinesMap = { claude: [], gemini: [], copilot: [], codex: [] };

let lineId = 0;
function mkLine(type: TerminalLine['type'], text: string): TerminalLine {
    return { type, text, id: ++lineId };
}

export function TerminalPanel() {
    const { repository } = useRepository();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<CliTab>('claude');
    const [input, setInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [lines, setLines] = useState<LinesMap>(EMPTY_LINES);
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Auto-scroll to bottom when new lines arrive
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [lines[activeTab]]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

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
                headers: { 'Content-Type': 'application/json' },
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

    const clearTab = () => {
        setLines(prev => ({ ...prev, [activeTab]: [] }));
    };

    const handleTabClick = (id: CliTab) => {
        setActiveTab(id);
        if (!isOpen) setIsOpen(true);
    };

    const repoPath = repository?.metadata?.localPath;
    const currentLines = lines[activeTab];

    return (
        <div
            className={cn(
                'fixed left-64 right-80 z-40 bg-[#0a0a0a] border-t border-border flex flex-col transition-all duration-300',
                isOpen ? 'bottom-0 h-72' : 'bottom-0 h-8',
            )}
        >
            {/* Header bar */}
            <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border/50 bg-card/80 px-3">
                <Terminal className="size-3.5 text-primary shrink-0" />

                {/* CLI tab buttons */}
                <div className="flex items-center gap-0.5">
                    {CLI_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={cn(
                                'rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                                activeTab === tab.id && isOpen
                                    ? `border border-border bg-bg ${tab.colorClass}`
                                    : 'text-text-dim hover:text-accent',
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Repo path */}
                {repoPath && (
                    <span className="ml-2 hidden truncate font-mono text-[9px] text-text-dim lg:block max-w-xs">
                        {repoPath}
                    </span>
                )}

                <div className="ml-auto flex items-center gap-1.5">
                    <button
                        onClick={clearTab}
                        title="Limpar terminal"
                        className="text-text-dim transition-colors hover:text-accent"
                    >
                        <Trash2 className="size-3" />
                    </button>
                    <button
                        onClick={() => setIsOpen(v => !v)}
                        title={isOpen ? 'Recolher' : 'Expandir'}
                        className="text-text-dim transition-colors hover:text-accent"
                    >
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                    </button>
                </div>
            </div>

            {/* Terminal body */}
            {isOpen && (
                <div className="flex min-h-0 flex-1 flex-col">
                    {/* Output */}
                    <div
                        ref={outputRef}
                        className="scrollbar-kairos flex-1 overflow-y-auto p-3 font-mono text-xs"
                    >
                        {currentLines.length === 0 && (
                            <p className="italic text-text-dim">
                                {repoPath
                                    ? `Terminal pronto — cwd: ${repoPath}`
                                    : 'Terminal pronto — nenhum repositório selecionado'}
                            </p>
                        )}
                        {currentLines.map(line => (
                            <div
                                key={line.id}
                                className={cn(
                                    'whitespace-pre-wrap break-all leading-relaxed',
                                    line.type === 'input' ? 'text-primary' :
                                        line.type === 'stderr' ? 'text-red-400' :
                                            line.type === 'exit' ? 'text-text-dim text-[10px]' :
                                                'text-green-300',
                                )}
                            >
                                {line.text}
                            </div>
                        ))}
                        {isRunning && (
                            <span className="animate-pulse text-text-dim">▋</span>
                        )}
                    </div>

                    {/* Input row */}
                    <div className="flex items-center gap-2 border-t border-border/50 px-3 py-2">
                        <span className="shrink-0 font-mono text-xs text-primary">$</span>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isRunning}
                            rows={1}
                            placeholder={`Prompt para ${activeTab}… (Enter para enviar)`}
                            className="flex-1 resize-none bg-transparent font-mono text-xs text-highlight placeholder:text-text-dim focus:outline-none disabled:opacity-50"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!input.trim() || isRunning}
                            className="shrink-0 text-primary transition-colors hover:text-accent disabled:opacity-40"
                        >
                            <Send className="size-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
