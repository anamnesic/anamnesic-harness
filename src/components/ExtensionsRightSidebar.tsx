'use client';

import { useMemo, useState } from 'react';
import { Blocks, ExternalLink, Search, ServerCog, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useApi } from '../lib/api';

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
    const [query, setQuery] = useState('');
    const [openSections, setOpenSections] = useState({
        catalog: true,
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

    const openVsxQueryUrl = useMemo(() => {
        const encoded = encodeURIComponent(`mcp ${query}`.trim());
        return `https://open-vsx.org/?search=${encoded}`;
    }, [query]);

    function toggleSection(section: 'catalog' | 'recommended') {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
                                <a
                                    href={`https://open-vsx.org/extension/${item.namespace}/${item.name}`}
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
        </section>
    );
}
