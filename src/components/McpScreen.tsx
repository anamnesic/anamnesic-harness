'use client';

import { useMemo, useState } from 'react';
import { Blocks, ExternalLink, Search, ServerCog, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiFetch, useApi } from '../lib/api';
import { useToast } from './Toast';

interface OpenVsxExtension {
    id: string;
    namespace: string;
    name: string;
    version: string;
    displayName: string;
    description: string;
    verified: boolean;
    deprecated: boolean;
    files?: {
        icon?: string;
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

interface McpSeed {
    id: string;
    title: string;
    description: string;
    openVsxUrl: string;
}

const MCP_SEEDS: McpSeed[] = [
    {
        id: 'mcp-github',
        title: 'MCP GitHub Server',
        description: 'Integra issues, pull requests e automações de repositório.',
        openVsxUrl: 'https://open-vsx.org/?search=mcp%20github',
    },
    {
        id: 'mcp-filesystem',
        title: 'MCP Filesystem Server',
        description: 'Permite leitura e escrita segura no workspace via MCP.',
        openVsxUrl: 'https://open-vsx.org/?search=mcp%20filesystem',
    },
    {
        id: 'mcp-browser',
        title: 'MCP Browser Tools',
        description: 'Automação de browser para fluxos assistidos no Kairos.',
        openVsxUrl: 'https://open-vsx.org/?search=mcp%20browser',
    },
];

function matchesSearchTerm(text: string, query: string): boolean {
    if (!query.trim()) {
        return true;
    }
    return text.toLowerCase().includes(query.trim().toLowerCase());
}

export function McpScreen() {
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [openSections, setOpenSections] = useState({
        catalog: true,
        installed: true,
        recommended: true,
    });

    const mcpSearchUrl = useMemo(() => {
        const params = new URLSearchParams({
            query: query ? `mcp ${query}` : 'mcp',
            size: '20',
        });
        return `/api/v1/extensions/open-vsx/search?${params.toString()}`;
    }, [query]);

    const { data: mcpData, loading: mcpLoading } = useApi<{ data?: { extensions?: OpenVsxExtension[] } } | null>(mcpSearchUrl);

    const {
        data: installedData,
        loading: installedLoading,
        refetch: refetchInstalled,
    } = useApi<{ data?: { extensions?: InstalledOpenVsxExtension[] } } | null>('/api/v1/extensions/open-vsx/installed');

    const discovered = useMemo(
        () => (mcpData?.data?.extensions ?? []).filter((ext) => !ext.deprecated),
        [mcpData],
    );

    const filteredSeeds = useMemo(
        () => MCP_SEEDS.filter((item) => matchesSearchTerm(`${item.title} ${item.description}`, query)),
        [query],
    );

    const filteredDiscovered = useMemo(
        () => discovered.filter((item) => matchesSearchTerm(`${item.displayName} ${item.namespace} ${item.name} ${item.description}`, query)),
        [discovered, query],
    );

    const installedMcp = useMemo(() => {
        const installed = installedData?.data?.extensions ?? [];
        return installed.filter((item) => {
            const haystack = `${item.id} ${item.displayName} ${item.description}`.toLowerCase();
            return haystack.includes('mcp') || haystack.includes('model context protocol');
        });
    }, [installedData]);

    const installedSet = useMemo(
        () => new Set(installedMcp.map((item) => item.id.toLowerCase())),
        [installedMcp],
    );

    const openVsxQueryUrl = useMemo(() => {
        const encoded = encodeURIComponent(`mcp ${query}`.trim());
        return `https://open-vsx.org/?search=${encoded}`;
    }, [query]);

    function toggleSection(section: 'catalog' | 'installed' | 'recommended') {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    }

    async function handleInstall(namespace: string, name: string, id: string) {
        setBusyId(id);
        try {
            await apiFetch('/api/v1/extensions/open-vsx/install', {
                method: 'POST',
                body: JSON.stringify({ namespace, name }),
            });
            await refetchInstalled();
            toast('Conector MCP instalado', 'success');
        } catch (e: any) {
            toast(e?.message ?? 'Falha ao instalar conector MCP', 'error');
        } finally {
            setBusyId(null);
        }
    }

    async function handleUninstall(id: string) {
        setBusyId(id);
        try {
            await apiFetch('/api/v1/extensions/open-vsx/uninstall', {
                method: 'POST',
                body: JSON.stringify({ id }),
            });
            await refetchInstalled();
            toast('Conector MCP removido', 'success');
        } catch (e: any) {
            toast(e?.message ?? 'Falha ao remover conector MCP', 'error');
        } finally {
            setBusyId(null);
        }
    }

    return (
        <section className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
            <div className="rounded-xl border border-border bg-card/40 p-4">
                <div className="flex items-center gap-2 text-highlight">
                    <Blocks className="size-4 text-primary" />
                    <h2 className="text-xs font-black uppercase tracking-[0.22em]">MCP</h2>
                </div>
                <p className="mt-2 text-xs text-text-dim">Catálogo de conectores MCP. Recursos de extensões Open VSX foram removidos desta tela.</p>

                <div className="mt-4 flex items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-dim" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar conectores MCP"
                            className="w-full rounded-lg border border-border bg-bg/70 py-2 pl-9 pr-3 text-sm text-highlight placeholder:text-text-dim focus:border-primary/50 focus:outline-none"
                        />
                    </div>
                    <a
                        href={openVsxQueryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-primary hover:border-primary/60"
                    >
                        Open VSX
                        <ExternalLink className="size-3" />
                    </a>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card/30">
                <button
                    type="button"
                    onClick={() => toggleSection('catalog')}
                    className="flex w-full items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest text-highlight"
                >
                    <span>Recomendados ({filteredSeeds.length})</span>
                    <ChevronDown className={cn('size-4 transition-transform', openSections.catalog && 'rotate-180')} />
                </button>
                {openSections.catalog && (
                    <div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredSeeds.map((item) => (
                            <article key={item.id} className="rounded-lg border border-border bg-bg/50 p-3">
                                <div className="flex items-center gap-2">
                                    <ServerCog className="size-4 text-primary" />
                                    <h3 className="text-sm font-bold text-highlight">{item.title}</h3>
                                </div>
                                <p className="mt-2 text-xs text-text-dim">{item.description}</p>
                                <a
                                    href={item.openVsxUrl}
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

            <div className="rounded-xl border border-border bg-card/30">
                <button
                    type="button"
                    onClick={() => toggleSection('installed')}
                    className="flex w-full items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest text-highlight"
                >
                    <span>Instalados no Kairos ({installedMcp.length})</span>
                    <ChevronDown className={cn('size-4 transition-transform', openSections.installed && 'rotate-180')} />
                </button>
                {openSections.installed && (
                    <div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {installedLoading ? (
                            <p className="text-xs text-text-dim">Carregando conectores MCP instalados...</p>
                        ) : installedMcp.length === 0 ? (
                            <p className="text-xs text-text-dim">Nenhum conector MCP instalado.</p>
                        ) : installedMcp.map((item) => (
                            <article key={item.id} className="rounded-lg border border-border bg-bg/50 p-3">
                                <div className="flex items-center gap-2">
                                    {item.iconUrl ? (
                                        <img src={item.iconUrl} alt={item.displayName} className="size-4 rounded-sm object-cover" />
                                    ) : (
                                        <ServerCog className="size-4 text-primary" />
                                    )}
                                    <h3 className="text-sm font-bold text-highlight">{item.displayName}</h3>
                                </div>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-text-dim">{item.namespace}</p>
                                <p className="mt-2 text-xs text-text-dim">{item.description}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                                        Instalado
                                    </span>
                                    <button
                                        onClick={() => void handleUninstall(item.id)}
                                        disabled={busyId === item.id}
                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-400/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-300 hover:border-rose-400/70 disabled:opacity-60"
                                    >
                                        {busyId === item.id ? 'Removendo...' : 'Remover'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-border bg-card/30">
                <button
                    type="button"
                    onClick={() => toggleSection('recommended')}
                    className="flex w-full items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest text-highlight"
                >
                    <span>Descobertos no Open VSX ({filteredDiscovered.length})</span>
                    <ChevronDown className={cn('size-4 transition-transform', openSections.recommended && 'rotate-180')} />
                </button>
                {openSections.recommended && (
                    <div className="grid gap-3 border-t border-border/60 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {mcpLoading ? (
                            <p className="text-xs text-text-dim">Buscando conectores MCP...</p>
                        ) : filteredDiscovered.length === 0 ? (
                            <p className="text-xs text-text-dim">Nenhum conector MCP encontrado para a busca atual.</p>
                        ) : filteredDiscovered.map((item) => (
                            <article key={item.id} className="rounded-lg border border-border bg-bg/50 p-3">
                                <div className="flex items-center gap-2">
                                    {item.files?.icon ? (
                                        <img src={item.files.icon} alt={item.displayName} className="size-4 rounded-sm object-cover" />
                                    ) : (
                                        <ServerCog className="size-4 text-primary" />
                                    )}
                                    <h3 className="text-sm font-bold text-highlight">{item.displayName}</h3>
                                </div>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-text-dim">{item.namespace}</p>
                                <p className="mt-2 text-xs text-text-dim">{item.description}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <a
                                        href={`https://open-vsx.org/extension/${item.namespace}/${item.name}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-accent hover:border-accent/50"
                                    >
                                        Open VSX
                                        <ExternalLink className="size-3" />
                                    </a>
                                    {installedSet.has(item.id.toLowerCase()) ? (
                                        <button
                                            onClick={() => void handleUninstall(item.id)}
                                            disabled={busyId === item.id}
                                            className="inline-flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-400/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-300 hover:border-rose-400/70 disabled:opacity-60"
                                        >
                                            {busyId === item.id ? 'Removendo...' : 'Remover'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => void handleInstall(item.namespace, item.name, item.id)}
                                            disabled={busyId === item.id}
                                            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:border-primary/60 disabled:opacity-60"
                                        >
                                            {busyId === item.id ? 'Instalando...' : 'Instalar'}
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
