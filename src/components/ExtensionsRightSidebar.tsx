'use client';

import { useEffect, useMemo, useState } from 'react';
import { Blocks, TerminalSquare, PlugZap, ExternalLink, Search, ServerCog, Store, Bot, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { LucideIcon } from 'lucide-react';

type HostTabId = 'terminal' | 'integrations';

interface MarketplaceExtension {
    id: string;
    title: string;
    publisher: string;
    description: string;
    recommended?: boolean;
    openVsxUrl: string;
}

interface OpenVsxTabExtension {
    id: string;
    title: string;
    description: string;
    hostTab: HostTabId;
    icon: LucideIcon;
}

interface McpExtension {
    id: string;
    title: string;
    description: string;
    openVsxUrl: string;
}

const MARKET_EXTENSIONS: MarketplaceExtension[] = [
    {
        id: 'eclipse-cdt.cdt-gdb-vscode',
        title: 'C/C++ GDB Debug',
        publisher: 'Eclipse CDT',
        description: 'Depuração para projetos C/C++ com integração GDB em ambientes compatíveis.',
        recommended: true,
        openVsxUrl: 'https://open-vsx.org/extension/eclipse-cdt/cdt-gdb-vscode',
    },
    {
        id: 'redhat.vscode-yaml',
        title: 'YAML',
        publisher: 'Red Hat',
        description: 'Validação e autocomplete YAML com suporte a schemas.',
        recommended: true,
        openVsxUrl: 'https://open-vsx.org/extension/redhat/vscode-yaml',
    },
    {
        id: 'ms-python.python',
        title: 'Python',
        publisher: 'Microsoft',
        description: 'Suporte completo para Python com linting, debugging e ambientes virtuais.',
        recommended: true,
        openVsxUrl: 'https://open-vsx.org/extension/ms-python/python',
    },
    {
        id: 'esbenp.prettier-vscode',
        title: 'Prettier',
        publisher: 'Prettier',
        description: 'Formatação opinativa para JS/TS/JSON/Markdown e outros formatos.',
        recommended: true,
        openVsxUrl: 'https://open-vsx.org/extension/esbenp/prettier-vscode',
    },
    {
        id: 'dbaeumer.vscode-eslint',
        title: 'ESLint',
        publisher: 'Dirk Baeumer',
        description: 'Análise estática JavaScript/TypeScript com correções rápidas.',
        recommended: true,
        openVsxUrl: 'https://open-vsx.org/extension/dbaeumer/vscode-eslint',
    },
];

const OPEN_VSX_TAB_EXTENSIONS: OpenVsxTabExtension[] = [
    {
        id: 'kairos.integrations',
        title: 'Kairos Integrations',
        description: 'Integração Open VSX para configurar e operar conectores do Kairos.',
        hostTab: 'integrations',
        icon: PlugZap,
    },
    {
        id: 'kairos.terminal-tools',
        title: 'Kairos Terminal Tools',
        description: 'Extensão Open VSX do Kairos para fluxo de terminal integrado.',
        hostTab: 'terminal',
        icon: Bot,
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
    | { id: 'market'; label: 'Market'; icon: LucideIcon; extensionId?: undefined }
    | { id: `ext:${string}`; label: string; icon: LucideIcon; extensionId: string };

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
    const [openSections, setOpenSections] = useState({
        installed: true,
        recommended: false,
        mcp: false,
    });

    const installedWithTab = useMemo(
        () => OPEN_VSX_TAB_EXTENSIONS.filter((extension) => installedSet.has(extension.id)),
        [installedSet],
    );

    const tabs = useMemo<SidebarTab[]>(() => {
        const extensionTabs: SidebarTab[] = installedWithTab.map((extension) => ({
            id: `ext:${extension.id}`,
            label: extension.title,
            icon: extension.icon,
            extensionId: extension.id,
        }));
        return [{ id: 'market', label: 'Market', icon: Store }, ...extensionTabs];
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
        return OPEN_VSX_TAB_EXTENSIONS.find((extension) => extension.id === extensionId) ?? null;
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

    function toggleSection(section: 'installed' | 'recommended' | 'mcp') {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    }

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
                        title={tab.label}
                        className={cn(
                            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                            activeTab === tab.id
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-bg/50 text-text-dim hover:border-accent/50 hover:text-accent',
                        )}
                    >
                        <tab.icon className="size-4" />
                    </button>
                ))}
            </div>

            <div className="scrollbar-kairos flex-1 overflow-y-auto p-3">
                {activeTab === 'market' ? (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-border bg-bg/60 p-3">
                            <div className="flex items-center gap-2">
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

                        <div className="rounded-xl border border-border bg-bg/50">
                            <button
                                type="button"
                                onClick={() => toggleSection('installed')}
                                className="flex w-full items-center justify-between px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-highlight"
                            >
                                <span>Instalados ({filteredInstalled.length})</span>
                                <ChevronDown className={cn('size-4 transition-transform', openSections.installed && 'rotate-180')} />
                            </button>
                            {openSections.installed && (
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
                                                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                                                    Instalada
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-text-dim">{extension.description}</p>
                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                    <a
                                                        href={extension.openVsxUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent hover:border-accent/50"
                                                    >
                                                        Ver no Open VSX
                                                        <ExternalLink className="size-3" />
                                                    </a>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-border bg-bg/50">
                            <button
                                type="button"
                                onClick={() => toggleSection('recommended')}
                                className="flex w-full items-center justify-between px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-highlight"
                            >
                                <span>Recomendados ({filteredRecommended.length})</span>
                                <ChevronDown className={cn('size-4 transition-transform', openSections.recommended && 'rotate-180')} />
                            </button>
                            {openSections.recommended && (
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
                            )}
                        </div>

                        <div className="rounded-xl border border-border bg-bg/50">
                            <button
                                type="button"
                                onClick={() => toggleSection('mcp')}
                                className="flex w-full items-center justify-between px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-highlight"
                            >
                                <span>MCP ({filteredMcp.length})</span>
                                <ChevronDown className={cn('size-4 transition-transform', openSections.mcp && 'rotate-180')} />
                            </button>
                            {openSections.mcp && (
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
                            )}
                        </div>
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
