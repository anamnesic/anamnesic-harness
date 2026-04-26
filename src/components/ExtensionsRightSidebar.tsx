'use client';

import { useEffect, useMemo, useState } from 'react';
import { Blocks, TerminalSquare, PlugZap, ExternalLink, Search, ServerCog, Store, Bot, ChevronDown, Box } from 'lucide-react';
import { cn } from '../lib/utils';
import type { LucideIcon } from 'lucide-react';
import { apiFetch, useApi } from '../lib/api';
import { useToast } from './Toast';

type HostTabId = 'terminal' | 'integrations';

interface OpenVsxExtension {
    id: string;
    namespace: string;
    name: string;
    version: string;
    displayName: string;
    description: string;
    verified: boolean;
    deprecated: boolean;
    downloadCount: number;
    files?: {
        icon?: string;
        download?: string;
    };
}

interface InstalledOpenVsxExtension {
    id: string;
    namespace: string;
    name: string;
    version: string;
    displayName: string;
    description: string;
    installedAt: string;
    verified: boolean;
    downloadUrl?: string;
    iconUrl?: string;
}

interface ExtensionDetails {
    id: string;
    namespace: string;
    name: string;
    displayName: string;
    description: string;
    version?: string;
    verified?: boolean;
    iconUrl?: string;
}

interface McpExtension {
    id: string;
    title: string;
    description: string;
    openVsxUrl: string;
}

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
    | { id: 'market'; label: 'Market'; icon: LucideIcon; extensionId?: undefined; iconUrl?: undefined }
    | { id: `ext:${string}`; label: string; icon: LucideIcon; extensionId: string; iconUrl?: string };

function getInitialTab(tabs: SidebarTab[]): SidebarTab['id'] {
    return tabs[0]?.id ?? 'market';
}

interface ExtensionsRightSidebarProps {
    installedExtensionIds: string[];
    onNavigate: (tab: HostTabId) => void;
}

export function ExtensionsRightSidebar({ installedExtensionIds, onNavigate }: ExtensionsRightSidebarProps) {
    const { toast } = useToast();
    const [marketQuery, setMarketQuery] = useState('');
    const [busyExtensionId, setBusyExtensionId] = useState<string | null>(null);
    const [openSections, setOpenSections] = useState({
        installed: true,
        recommended: false,
        mcp: false,
    });
    const [selectedMarketExtension, setSelectedMarketExtension] = useState<ExtensionDetails | null>(null);
    const [iconLoadError, setIconLoadError] = useState<Record<string, boolean>>({});

    const searchUrl = useMemo(() => {
        const params = new URLSearchParams({
            query: marketQuery,
            size: '24',
        });
        return `/api/v1/extensions/open-vsx/search?${params.toString()}`;
    }, [marketQuery]);

    const {
        data: searchData,
        loading: searchLoading,
    } = useApi<{ data?: { extensions?: OpenVsxExtension[] } } | null>(searchUrl);

    const {
        data: mcpData,
        loading: mcpLoading,
    } = useApi<{ data?: { extensions?: OpenVsxExtension[] } } | null>('/api/v1/extensions/open-vsx/search?query=mcp&size=12');

    const {
        data: installedData,
        loading: installedLoading,
        refetch: refetchInstalled,
    } = useApi<{ data?: { extensions?: InstalledOpenVsxExtension[] } } | null>('/api/v1/extensions/open-vsx/installed');

    const installedRecords = useMemo(
        () => installedData?.data?.extensions ?? [],
        [installedData],
    );

    const installedIds = useMemo(() => {
        if (installedRecords.length > 0) {
            return installedRecords.map((entry) => entry.id.toLowerCase());
        }
        return installedExtensionIds.map((id) => id.toLowerCase());
    }, [installedRecords, installedExtensionIds]);

    const installedSet = useMemo(() => new Set(installedIds), [installedIds]);

    const searchResults = useMemo(
        () => searchData?.data?.extensions ?? [],
        [searchData],
    );

    const mcpResults = useMemo(
        () => mcpData?.data?.extensions ?? [],
        [mcpData],
    );

    const installedWithTab = useMemo(
        () => installedRecords.filter((extension) => installedSet.has(extension.id.toLowerCase())),
        [installedRecords, installedSet],
    );

    const tabs = useMemo<SidebarTab[]>(() => {
        const extensionTabs: SidebarTab[] = installedWithTab.map((extension) => ({
            id: `ext:${extension.id}`,
            label: extension.displayName,
            icon: Box,
            extensionId: extension.id,
            iconUrl: extension.iconUrl,
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
        return installedRecords.find((extension) => extension.id === extensionId) ?? null;
    }, [activeTab, installedRecords]);

    const selectedHostTab = useMemo<HostTabId | null>(() => {
        if (!selectedExtension) {
            return null;
        }
        const id = selectedExtension.id.toLowerCase();
        if (id.includes('integration')) {
            return 'integrations';
        }
        if (id.includes('terminal')) {
            return 'terminal';
        }
        return null;
    }, [selectedExtension]);

    const hostTabByExtensionId = useMemo(() => {
        const map = new Map<string, HostTabId>();
        for (const extension of installedRecords) {
            const id = extension.id.toLowerCase();
            if (id.includes('integration')) {
                map.set(extension.id, 'integrations');
                continue;
            }
            if (id.includes('terminal')) {
                map.set(extension.id, 'terminal');
            }
        }
        return map;
    }, [installedRecords]);

    const selectedReadmeUrl = useMemo(() => {
        if (!selectedMarketExtension) {
            return null;
        }
        return `/api/v1/extensions/open-vsx/${selectedMarketExtension.namespace}/${selectedMarketExtension.name}/readme`;
    }, [selectedMarketExtension]);

    const {
        data: selectedReadmeData,
        loading: selectedReadmeLoading,
    } = useApi<{ data?: { content?: string } } | null>(selectedReadmeUrl);

    const selectedReadmeSnippet = useMemo(() => {
        const content = selectedReadmeData?.data?.content ?? '';
        if (!content.trim()) {
            return '';
        }
        const normalized = content.replace(/\r/g, '').trim();
        return normalized.length > 1400 ? `${normalized.slice(0, 1400)}\n\n[...]` : normalized;
    }, [selectedReadmeData]);

    const openVsxSearchUrl = useMemo(() => {
        const query = encodeURIComponent(marketQuery.trim());
        return query ? `https://open-vsx.org/?search=${query}` : 'https://open-vsx.org/';
    }, [marketQuery]);

    const installedMarketExtensions = useMemo(
        () => installedRecords,
        [installedRecords],
    );

    const filteredInstalled = useMemo(
        () => installedMarketExtensions.filter((extension) => (
            matchesSearchTerm(`${extension.displayName} ${extension.namespace} ${extension.name} ${extension.description}`, marketQuery)
        )),
        [installedMarketExtensions, marketQuery],
    );

    const filteredRecommended = useMemo(
        () => searchResults
            .filter((extension) => (
                !installedSet.has(extension.id.toLowerCase())
                && !extension.deprecated
                && matchesSearchTerm(`${extension.displayName} ${extension.namespace} ${extension.name} ${extension.description}`, marketQuery)
            ))
            .sort((a, b) => {
                if (a.verified !== b.verified) {
                    return a.verified ? -1 : 1;
                }
                return (b.downloadCount ?? 0) - (a.downloadCount ?? 0);
            })
            .slice(0, 10),
        [searchResults, installedSet, marketQuery],
    );

    const filteredMcp = useMemo(
        () => mcpResults.filter((extension) => (
            !extension.deprecated
            && matchesSearchTerm(`${extension.displayName} ${extension.namespace} ${extension.name} ${extension.description}`, marketQuery)
        )),
        [mcpResults, marketQuery],
    );

    async function handleInstall(namespace: string, name: string, id: string) {
        setBusyExtensionId(id);
        try {
            await apiFetch('/api/v1/extensions/open-vsx/install', {
                method: 'POST',
                body: JSON.stringify({ namespace, name }),
            });
            await refetchInstalled();
            toast('Extensão instalada', 'success');
        } catch (e: any) {
            toast(e?.message ?? 'Falha ao instalar extensão', 'error');
        } finally {
            setBusyExtensionId(null);
        }
    }

    async function handleUninstall(id: string) {
        setBusyExtensionId(id);
        try {
            await apiFetch('/api/v1/extensions/open-vsx/uninstall', {
                method: 'POST',
                body: JSON.stringify({ id }),
            });
            await refetchInstalled();
            toast('Extensão removida', 'success');
        } catch (e: any) {
            toast(e?.message ?? 'Falha ao remover extensão', 'error');
        } finally {
            setBusyExtensionId(null);
        }
    }

    function toggleSection(section: 'installed' | 'recommended' | 'mcp') {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    }

    function openMarketDetails(extension: ExtensionDetails) {
        setSelectedMarketExtension(extension);
    }

    function closeMarketDetails() {
        setSelectedMarketExtension(null);
    }

    function handleTabClick(tab: SidebarTab) {
        if (tab.id === 'market') {
            setActiveTab('market');
            return;
        }

        if (!tab.extensionId) {
            setActiveTab(tab.id);
            return;
        }

        const hostTab = hostTabByExtensionId.get(tab.extensionId);
        if (hostTab) {
            onNavigate(hostTab);
            return;
        }

        setActiveTab(tab.id);
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
                        onClick={() => handleTabClick(tab)}
                        title={tab.label}
                        className={cn(
                            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                            activeTab === tab.id
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-bg/50 text-text-dim hover:border-accent/50 hover:text-accent',
                        )}
                    >
                        {tab.iconUrl && !iconLoadError[tab.id] ? (
                            <img
                                src={tab.iconUrl}
                                alt={tab.label}
                                className="size-4 rounded-sm object-cover"
                                onError={() => setIconLoadError((prev) => ({ ...prev, [tab.id]: true }))}
                            />
                        ) : (
                            <tab.icon className="size-4" />
                        )}
                    </button>
                ))}
            </div>

            <div className="scrollbar-kairos flex-1 overflow-y-auto p-3">
                {activeTab === 'market' ? (
                    <div className="space-y-3">
                        {selectedMarketExtension ? (
                            <div className="space-y-3">
                                <div className="rounded-xl border border-border bg-bg/50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-dim">Detalhes da extensao</p>
                                    <div className="mt-2 flex items-start gap-3">
                                        {selectedMarketExtension.iconUrl && !iconLoadError[`market:${selectedMarketExtension.id}`] ? (
                                            <img
                                                src={selectedMarketExtension.iconUrl}
                                                alt={selectedMarketExtension.displayName}
                                                className="size-10 rounded-lg border border-border/70 bg-card/60 object-cover"
                                                onError={() => setIconLoadError((prev) => ({ ...prev, [`market:${selectedMarketExtension.id}`]: true }))}
                                            />
                                        ) : (
                                            <div className="flex size-10 items-center justify-center rounded-lg border border-border/70 bg-card/60">
                                                <Box className="size-5 text-primary" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <h4 className="truncate text-lg font-black tracking-tight text-highlight">{selectedMarketExtension.displayName}</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">{selectedMarketExtension.namespace}.{selectedMarketExtension.name}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs text-text-dim">{selectedMarketExtension.description}</p>

                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        {selectedMarketExtension.verified && (
                                            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-300">
                                                Verificada
                                            </span>
                                        )}
                                        {selectedMarketExtension.version && (
                                            <span className="rounded-full border border-border/80 bg-card/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-text-dim">
                                                v{selectedMarketExtension.version}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <a
                                            href={`https://open-vsx.org/extension/${selectedMarketExtension.namespace}/${selectedMarketExtension.name}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent hover:border-accent/50"
                                        >
                                            Open VSX
                                            <ExternalLink className="size-3" />
                                        </a>
                                        {installedSet.has(selectedMarketExtension.id.toLowerCase()) ? (
                                            <button
                                                onClick={() => handleUninstall(selectedMarketExtension.id)}
                                                disabled={busyExtensionId === selectedMarketExtension.id}
                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-400/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-300 hover:border-rose-400/70 disabled:opacity-60"
                                            >
                                                {busyExtensionId === selectedMarketExtension.id ? 'Removendo...' : 'Remover'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleInstall(selectedMarketExtension.namespace, selectedMarketExtension.name, selectedMarketExtension.id)}
                                                disabled={busyExtensionId === selectedMarketExtension.id}
                                                className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:border-primary/60 disabled:opacity-60"
                                            >
                                                {busyExtensionId === selectedMarketExtension.id ? 'Instalando...' : 'Instalar'}
                                            </button>
                                        )}
                                        <button
                                            onClick={closeMarketDetails}
                                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-text-dim hover:border-accent/40 hover:text-accent"
                                        >
                                            Voltar ao market
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-bg/50 p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-dim">README da extensao</p>
                                    {selectedReadmeLoading ? (
                                        <p className="mt-2 text-xs text-text-dim">Carregando README...</p>
                                    ) : selectedReadmeSnippet ? (
                                        <pre className="scrollbar-kairos mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border/70 bg-card/60 p-3 text-[11px] leading-relaxed text-text-dim">
                                            {selectedReadmeSnippet}
                                        </pre>
                                    ) : (
                                        <p className="mt-2 text-xs text-text-dim">README indisponivel para esta extensao.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
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
                                    {installedLoading ? (
                                        <p className="text-xs text-text-dim">Carregando extensoes instaladas...</p>
                                    ) : filteredInstalled.length === 0 ? (
                                        <p className="text-xs text-text-dim">Nenhuma extensao instalada encontrada para esta busca.</p>
                                    ) : filteredInstalled.map((extension) => (
                                        <article
                                            key={extension.id}
                                            onClick={() => openMarketDetails({
                                                id: extension.id,
                                                namespace: extension.namespace,
                                                name: extension.name,
                                                displayName: extension.displayName,
                                                description: extension.description,
                                                version: extension.version,
                                                verified: extension.verified,
                                                iconUrl: extension.iconUrl,
                                            })}
                                            className="cursor-pointer rounded-lg border border-border bg-card/40 p-3 hover:border-accent/40"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className="text-sm font-bold text-highlight">{extension.displayName}</h4>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">{extension.namespace}</p>
                                                </div>
                                                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                                                    Instalada
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-text-dim">{extension.description}</p>
                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                <a
                                                    href={`https://open-vsx.org/extension/${extension.namespace}/${extension.name}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent hover:border-accent/50"
                                                >
                                                    Ver no Open VSX
                                                    <ExternalLink className="size-3" />
                                                </a>
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handleUninstall(extension.id);
                                                    }}
                                                    disabled={busyExtensionId === extension.id}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-400/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-300 hover:border-rose-400/70 disabled:opacity-60"
                                                >
                                                    {busyExtensionId === extension.id ? 'Removendo...' : 'Remover'}
                                                </button>
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
                                    {searchLoading ? (
                                        <p className="text-xs text-text-dim">Buscando extensoes no Open VSX...</p>
                                    ) : filteredRecommended.length === 0 ? (
                                        <p className="text-xs text-text-dim">Nenhuma recomendacao disponivel para esta busca.</p>
                                    ) : filteredRecommended.map((extension) => (
                                        <article
                                            key={extension.id}
                                            onClick={() => openMarketDetails({
                                                id: extension.id,
                                                namespace: extension.namespace,
                                                name: extension.name,
                                                displayName: extension.displayName,
                                                description: extension.description,
                                                version: extension.version,
                                                verified: extension.verified,
                                                iconUrl: extension.files?.icon,
                                            })}
                                            className="cursor-pointer rounded-lg border border-border bg-card/40 p-3 hover:border-accent/40"
                                        >
                                            <h4 className="text-sm font-bold text-highlight">{extension.displayName}</h4>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">{extension.namespace}</p>
                                            <p className="mt-2 text-xs text-text-dim">{extension.description}</p>
                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                <a
                                                    href={`https://open-vsx.org/extension/${extension.namespace}/${extension.name}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent hover:border-accent/50"
                                                >
                                                    Ver no Open VSX
                                                    <ExternalLink className="size-3" />
                                                </a>
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void handleInstall(extension.namespace, extension.name, extension.id);
                                                    }}
                                                    disabled={busyExtensionId === extension.id}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:border-primary/60 disabled:opacity-60"
                                                >
                                                    {busyExtensionId === extension.id ? 'Instalando...' : 'Instalar'}
                                                </button>
                                            </div>
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
                                    {mcpLoading ? (
                                        <p className="text-xs text-text-dim">Buscando conectores MCP...</p>
                                    ) : filteredMcp.length === 0 ? (
                                        <p className="text-xs text-text-dim">Nenhum conector MCP encontrado para esta busca.</p>
                                    ) : filteredMcp.map((extension) => (
                                        <article
                                            key={extension.id}
                                            onClick={() => openMarketDetails({
                                                id: extension.id,
                                                namespace: extension.namespace,
                                                name: extension.name,
                                                displayName: extension.displayName,
                                                description: extension.description,
                                                version: extension.version,
                                                verified: extension.verified,
                                                iconUrl: extension.files?.icon,
                                            })}
                                            className="cursor-pointer rounded-lg border border-border bg-card/40 p-3 hover:border-accent/40"
                                        >
                                            <div className="flex items-center gap-2">
                                                <ServerCog className="size-4 text-primary" />
                                                <h4 className="text-sm font-bold text-highlight">{extension.displayName}</h4>
                                            </div>
                                            <p className="mt-2 text-xs text-text-dim">{extension.description}</p>
                                            <a
                                                href={`https://open-vsx.org/extension/${extension.namespace}/${extension.name}`}
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
                            </>
                        )}
                    </div>
                ) : selectedExtension ? (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-border bg-bg/50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-dim">Tela da extensao instalada</p>
                            <h4 className="mt-2 text-sm font-black text-highlight">{selectedExtension.displayName}</h4>
                            <p className="mt-2 text-xs text-text-dim">Use o card da extensao no Market para ver detalhes, README e acoes de instalacao/remocao.</p>

                            {selectedHostTab ? (
                                <button
                                    onClick={() => onNavigate(selectedHostTab)}
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-primary hover:border-primary/60"
                                >
                                    {selectedHostTab === 'terminal' ? <TerminalSquare className="size-4" /> : <PlugZap className="size-4" />}
                                    Abrir tela real da extensao
                                </button>
                            ) : (
                                <p className="mt-3 rounded-lg border border-border/70 bg-card/60 p-3 text-xs text-text-dim">
                                    Esta extensao nao possui tela dedicada mapeada no Kairos ainda.
                                </p>
                            )}

                            <button
                                onClick={() => {
                                    setActiveTab('market');
                                    setSelectedMarketExtension({
                                        id: selectedExtension.id,
                                        namespace: selectedExtension.namespace,
                                        name: selectedExtension.name,
                                        displayName: selectedExtension.displayName,
                                        description: selectedExtension.description,
                                        version: selectedExtension.version,
                                        verified: selectedExtension.verified,
                                        iconUrl: selectedExtension.iconUrl,
                                    });
                                }}
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-accent hover:border-accent/50"
                            >
                                Ver detalhes no Market
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
