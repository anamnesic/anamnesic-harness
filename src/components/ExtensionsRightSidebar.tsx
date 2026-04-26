'use client';

import { useEffect, useMemo, useState } from 'react';
import { Blocks, TerminalSquare, PlugZap, ExternalLink, Search, ServerCog } from 'lucide-react';
import { cn } from '../lib/utils';

type HostTabId = 'terminal' | 'integrations';

interface MarketplaceExtension {
    id: string;
    title: string;
    publisher: string;
    description: string;
    recommended?: boolean;
    hasTab: boolean;
    hostTab: HostTabId;
    openVsxUrl: string;
    commandHint: string;
    accentClass: string;
}

interface McpExtension {
    id: string;
    title: string;
    description: string;
    openVsxUrl: string;
}

const MARKET_EXTENSIONS: MarketplaceExtension[] = [
    {
        id: 'claude-code',
        title: 'Claude Code',
        publisher: 'Anthropic',
        description: 'Integra o runtime Claude CLI para tarefas assistidas por terminal.',
        recommended: true,
        hasTab: true,
        hostTab: 'terminal',
        openVsxUrl: 'https://open-vsx.org/?search=claude',
        commandHint: 'claude',
        accentClass: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    },
    {
        id: 'gemini',
        title: 'Gemini CLI',
        publisher: 'Google',
        description: 'Permite execução de prompts e automações via Gemini no painel de terminal.',
        recommended: true,
        hasTab: true,
        hostTab: 'terminal',
        openVsxUrl: 'https://open-vsx.org/?search=gemini',
        commandHint: 'gemini',
        accentClass: 'text-sky-400 border-sky-400/30 bg-sky-400/10',
    },
    {
        id: 'copilot',
        title: 'Copilot CLI',
        publisher: 'GitHub',
        description: 'Conecta automação orientada por comandos com backend do Copilot CLI.',
        recommended: true,
        hasTab: true,
        hostTab: 'terminal',
        openVsxUrl: 'https://open-vsx.org/?search=copilot',
        commandHint: 'copilot',
        accentClass: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    },
    {
        id: 'codex',
        title: 'Codex CLI',
        publisher: 'OpenAI',
        description: 'Canal de execução para tarefas de engenharia com o adaptador Codex.',
        recommended: true,
        hasTab: true,
        hostTab: 'terminal',
        openVsxUrl: 'https://open-vsx.org/?search=codex',
        commandHint: 'codex',
        accentClass: 'text-fuchsia-400 border-fuchsia-400/30 bg-fuchsia-400/10',
    },
    {
        id: 'webhooks',
        title: 'Webhooks',
        publisher: 'Kairos',
        description: 'Extensão de integração para saída em Slack, Discord e endpoints customizados.',
        hasTab: true,
        hostTab: 'integrations',
        openVsxUrl: 'https://open-vsx.org/?search=webhook',
        commandHint: 'configure /api/v1/integrations',
        accentClass: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    },
];

const MCP_EXTENSIONS: McpExtension[] = [
    {
        id: 'mcp-github',
        title: 'MCP GitHub Server',
        description: 'Conectores para issues, PRs e automações de repositório.',
        openVsxUrl: 'https://open-vsx.org/?search=mcp%20github',
    },
    {
        id: 'mcp-filesystem',
        title: 'MCP Filesystem Server',
        description: 'Acesso seguro ao workspace para leitura e escrita controlada.',
        openVsxUrl: 'https://open-vsx.org/?search=mcp%20filesystem',
    },
    {
        id: 'mcp-browser',
        title: 'MCP Browser Tools',
        description: 'Automação de browser para fluxos assistidos e validação UI.',
        openVsxUrl: 'https://open-vsx.org/?search=mcp%20browser',
    },
];

function matchesSearchTerm(text: string, query: string): boolean {
    if (!query.trim()) {
        return true;
    }
    return text.toLowerCase().includes(query.trim().toLowerCase());
}

type SidebarTab =
    | { id: 'market'; label: 'Market'; extensionId?: undefined }
    | { id: `ext:${string}`; label: string; extensionId: string };

function getInitialTab(tabs: SidebarTab[]): SidebarTab['id'] {
    return tabs[0]?.id ?? 'market';
}

interface ExtensionsRightSidebarProps {
    installedExtensionIds: string[];
    onNavigate: (tab: HostTabId) => void;
}

export function ExtensionsRightSidebar({ installedExtensionIds, onNavigate }: ExtensionsRightSidebarProps) {
    const installedSet = useMemo(() => new Set(installedExtensionIds), [installedExtensionIds]);
    const [marketQuery, setMarketQuery] = useState('');

    const installedWithTab = useMemo(
        () => MARKET_EXTENSIONS.filter((extension) => extension.hasTab && installedSet.has(extension.id)),
        [installedSet],
    );

    const tabs = useMemo<SidebarTab[]>(() => {
        const extensionTabs: SidebarTab[] = installedWithTab.map((extension) => ({
            id: `ext:${extension.id}`,
            label: extension.title,
            extensionId: extension.id,
        }));
        return [{ id: 'market', label: 'Market' }, ...extensionTabs];
    }, [installedWithTab]);

    const [activeTab, setActiveTab] = useState<SidebarTab['id']>(() => getInitialTab(tabs));

    useEffect(() => {
        if (!tabs.some((tab) => tab.id === activeTab)) {
            setActiveTab(getInitialTab(tabs));
        }
    }, [tabs, activeTab]);

    const selectedExtension = useMemo(() => {
        if (!activeTab.startsWith('ext:')) {
            return null;
        }
        const extensionId = activeTab.replace('ext:', '');
        return MARKET_EXTENSIONS.find((extension) => extension.id === extensionId) ?? null;
    }, [activeTab]);

    const openVsxSearchUrl = useMemo(() => {
        const query = encodeURIComponent(marketQuery.trim());
        return query ? `https://open-vsx.org/?search=${query}` : 'https://open-vsx.org/';
    }, [marketQuery]);

    const installedMarketExtensions = useMemo(
        () => MARKET_EXTENSIONS.filter((extension) => installedSet.has(extension.id)),
        [installedSet],
    );

    const filteredInstalled = useMemo(
        () => installedMarketExtensions.filter((extension) => (
            matchesSearchTerm(`${extension.title} ${extension.publisher} ${extension.description}`, marketQuery)
        )),
        [installedMarketExtensions, marketQuery],
    );

    const filteredRecommended = useMemo(
        () => MARKET_EXTENSIONS.filter((extension) => (
            extension.recommended
            && !installedSet.has(extension.id)
            && matchesSearchTerm(`${extension.title} ${extension.publisher} ${extension.description}`, marketQuery)
        )),
        [installedSet, marketQuery],
    );

    const filteredMcp = useMemo(
        () => MCP_EXTENSIONS.filter((extension) => matchesSearchTerm(`${extension.title} ${extension.description}`, marketQuery)),
        [marketQuery],
    );

    return (
        <aside className="hidden xl:flex h-screen w-88 shrink-0 flex-col border-l border-border bg-card/30">
            <div className="border-b border-border/60 px-4 py-4">
                <div className="flex items-center gap-2 text-highlight">
                    <Blocks className="size-4 text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-[0.22em]">Extensoes</h3>
                </div>
                <p className="mt-2 text-[11px] text-text-dim">Open VSX Market com abas dinamicas para extensoes instaladas.</p>
            </div>

            <div className="scrollbar-kairos flex gap-2 overflow-x-auto border-b border-border/60 px-3 py-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            'whitespace-nowrap rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors',
                            activeTab === tab.id
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-bg/50 text-text-dim hover:border-accent/50 hover:text-accent',
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="scrollbar-kairos flex-1 overflow-y-auto p-3">
                {activeTab === 'market' ? (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-border bg-bg/60 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-dim">Open VSX Marketplace</p>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-dim" />
                                    <input
                                        value={marketQuery}
                                        onChange={(event) => setMarketQuery(event.target.value)}
                                        placeholder="Buscar extensao no Open VSX"
                                        className="w-full rounded-lg border border-border bg-card/40 py-2 pl-9 pr-3 text-xs text-highlight placeholder:text-text-dim focus:border-primary/50 focus:outline-none"
                                    />
                                </div>
                                <a
                                    href={openVsxSearchUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary hover:border-primary/60"
                                >
                                    Buscar
                                    <ExternalLink className="size-3" />
                                </a>
                            </div>
                        </div>

                        <details className="rounded-xl border border-border bg-bg/50" open>
                            <summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-highlight">
                                Instalados ({filteredInstalled.length})
                            </summary>
                            <div className="space-y-2 border-t border-border/60 p-3">
                                {filteredInstalled.length === 0 ? (
                                    <p className="text-xs text-text-dim">Nenhuma extensao instalada encontrada para esta busca.</p>
                                ) : filteredInstalled.map((extension) => (
                                    <article key={extension.id} className="rounded-lg border border-border bg-card/40 p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className="text-sm font-bold text-highlight">{extension.title}</h4>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">{extension.publisher}</p>
                                            </div>
                                            <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider', extension.accentClass)}>
                                                Instalada
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-text-dim">{extension.description}</p>
                                        <div className="mt-3 flex items-center justify-between gap-2">
                                            <button
                                                onClick={() => onNavigate(extension.hostTab)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:border-primary/60"
                                            >
                                                {extension.hostTab === 'terminal' ? <TerminalSquare className="size-3.5" /> : <PlugZap className="size-3.5" />}
                                                Abrir aba
                                            </button>
                                            <span className="rounded-md border border-border bg-bg px-2 py-1 text-[10px] text-text-dim">
                                                {extension.commandHint}
                                            </span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </details>

                        <details className="rounded-xl border border-border bg-bg/50" open>
                            <summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-highlight">
                                Recomendados ({filteredRecommended.length})
                            </summary>
                            <div className="space-y-2 border-t border-border/60 p-3">
                                {filteredRecommended.length === 0 ? (
                                    <p className="text-xs text-text-dim">Nenhuma recomendacao disponivel para esta busca.</p>
                                ) : filteredRecommended.map((extension) => (
                                    <article key={extension.id} className="rounded-lg border border-border bg-card/40 p-3">
                                        <h4 className="text-sm font-bold text-highlight">{extension.title}</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">{extension.publisher}</p>
                                        <p className="mt-2 text-xs text-text-dim">{extension.description}</p>
                                        <a
                                            href={extension.openVsxUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent hover:border-accent/50"
                                        >
                                            Ver no Open VSX
                                            <ExternalLink className="size-3" />
                                        </a>
                                    </article>
                                ))}
                            </div>
                        </details>

                        <details className="rounded-xl border border-border bg-bg/50" open>
                            <summary className="cursor-pointer list-none px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-highlight">
                                MCP ({filteredMcp.length})
                            </summary>
                            <div className="space-y-2 border-t border-border/60 p-3">
                                {filteredMcp.length === 0 ? (
                                    <p className="text-xs text-text-dim">Nenhum conector MCP encontrado para esta busca.</p>
                                ) : filteredMcp.map((extension) => (
                                    <article key={extension.id} className="rounded-lg border border-border bg-card/40 p-3">
                                        <div className="flex items-center gap-2">
                                            <ServerCog className="size-4 text-primary" />
                                            <h4 className="text-sm font-bold text-highlight">{extension.title}</h4>
                                        </div>
                                        <p className="mt-2 text-xs text-text-dim">{extension.description}</p>
                                        <a
                                            href={extension.openVsxUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent hover:border-accent/50"
                                        >
                                            Abrir no Open VSX
                                            <ExternalLink className="size-3" />
                                        </a>
                                    </article>
                                ))}
                            </div>
                        </details>
                    </div>
                ) : selectedExtension ? (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-border bg-bg/50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-dim">Aba da extensao instalada</p>
                            <h4 className="mt-2 text-lg font-black tracking-tight text-highlight">{selectedExtension.title}</h4>
                            <p className="mt-2 text-xs text-text-dim">{selectedExtension.description}</p>

                            <div className="mt-4 rounded-lg border border-border bg-card/70 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">Status</p>
                                <p className="mt-1 text-xs text-accent">Instalada e pronta para uso no painel correspondente.</p>
                            </div>

                            <button
                                onClick={() => onNavigate(selectedExtension.hostTab)}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-primary hover:border-primary/60"
                            >
                                {selectedExtension.hostTab === 'terminal' ? <TerminalSquare className="size-4" /> : <PlugZap className="size-4" />}
                                Abrir aba no painel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border bg-bg/40 p-4 text-xs text-text-dim">
                        Nenhuma extensao instalada com aba disponivel.
                    </div>
                )}
            </div>
        </aside>
    );
}
