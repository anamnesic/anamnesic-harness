'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApi } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

interface DocsResponse {
    success: boolean;
    data?: {
        exists: boolean;
        files: string[];
        selectedFile: string | null;
        content: string;
    };
    timestamp: string;
}

interface DocsTreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: DocsTreeNode[];
}

function buildDocsTree(files: string[]): DocsTreeNode[] {
    type MutableNode = { type: 'file' | 'folder'; children: Map<string, MutableNode> };
    const root = new Map<string, MutableNode>();

    for (const file of files) {
        const normalized = file.replace(/\\/g, '/');
        const parts = normalized.split('/').filter(Boolean);
        if (!parts.length) continue;

        let cursor = root;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLeaf = i === parts.length - 1;
            const existing = cursor.get(part);
            if (existing) {
                cursor = existing.children;
                continue;
            }

            const next: MutableNode = {
                type: isLeaf ? 'file' : 'folder',
                children: new Map<string, MutableNode>(),
            };
            cursor.set(part, next);
            cursor = next.children;
        }
    }

    const toArray = (map: Map<string, MutableNode>, parentPath = ''): DocsTreeNode[] => {
        const entries = Array.from(map.entries());
        entries.sort((a, b) => {
            if (a[1].type !== b[1].type) {
                return a[1].type === 'folder' ? -1 : 1;
            }
            return a[0].localeCompare(b[0]);
        });

        return entries.map(([name, node]) => {
            const path = parentPath ? `${parentPath}/${name}` : name;
            if (node.type === 'folder') {
                return {
                    name,
                    path,
                    type: 'folder',
                    children: toArray(node.children, path),
                };
            }

            return {
                name,
                path,
                type: 'file',
            };
        });
    };

    return toArray(root);
}

export function ProjectContext({ projectId }: { projectId: string }) {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

    const apiPath = useMemo(() => {
        const base = `/api/v1/projects/${projectId}/docs`;
        if (!selectedFile) return base;
        return `${base}?file=${encodeURIComponent(selectedFile)}`;
    }, [projectId, selectedFile]);

    const { data, loading, refetch } = useApi<DocsResponse>(apiPath);
    const payload = data?.data;

    useEffect(() => {
        if (!payload?.selectedFile) return;
        if (!selectedFile) {
            setSelectedFile(payload.selectedFile);
        }
    }, [payload?.selectedFile, selectedFile]);

    const files = payload?.files ?? [];
    const filteredFiles = files.filter((file) => file.toLowerCase().includes(query.toLowerCase()));
    const tree = useMemo(() => buildDocsTree(filteredFiles), [filteredFiles]);

    function renderTree(nodes: DocsTreeNode[], depth = 0): React.ReactNode {
        return nodes.map((node) => {
            if (node.type === 'folder') {
                const isCollapsed = collapsedFolders[node.path] === true;
                return (
                    <div key={node.path}>
                        <button
                            onClick={() => setCollapsedFolders((prev) => ({ ...prev, [node.path]: !isCollapsed }))}
                            className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left hover:bg-card/40"
                            style={{ paddingLeft: `${8 + depth * 14}px` }}
                            title={node.path}
                        >
                            {isCollapsed ? (
                                <ChevronRight className="size-3 shrink-0 text-text-dim" />
                            ) : (
                                <ChevronDown className="size-3 shrink-0 text-text-dim" />
                            )}
                            {isCollapsed ? (
                                <Folder className="size-3.5 shrink-0 text-stone-300" />
                            ) : (
                                <FolderOpen className="size-3.5 shrink-0 text-stone-300" />
                            )}
                            <span className="truncate text-xs text-highlight">{node.name}</span>
                        </button>
                        {!isCollapsed && node.children?.length ? renderTree(node.children, depth + 1) : null}
                    </div>
                );
            }

            return (
                <button
                    key={node.path}
                    onClick={() => setSelectedFile(node.path)}
                    className={cn(
                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card/40',
                        selectedFile === node.path ? 'bg-card text-accent border border-border' : 'text-text-dim hover:text-highlight',
                    )}
                    style={{ paddingLeft: `${26 + depth * 14}px` }}
                    title={node.path}
                >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate font-mono text-xs">{node.name}</span>
                </button>
            );
        });
    }

    return (
        <div className="grid min-h-128 grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
            <aside className="bento-card min-h-0">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="size-4 text-primary" />
                        <p className="label-caps">Docs</p>
                    </div>
                    <button
                        onClick={() => void refetch()}
                        className="rounded-md border border-border px-2 py-1 text-[10px] font-bold text-text-dim hover:text-accent transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filtrar arquivos .md"
                    className="mb-3 w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-highlight placeholder:text-text-dim focus:border-primary/60 outline-none transition-colors"
                />

                {loading ? (
                    <p className="text-sm text-text-dim">Carregando docs...</p>
                ) : !payload?.exists ? (
                    <p className="text-sm text-text-dim">A pasta docs nao existe neste repositorio.</p>
                ) : !files.length ? (
                    <p className="text-sm text-text-dim">Nenhum arquivo .md encontrado em docs.</p>
                ) : (
                    <div className="max-h-96 space-y-1 overflow-y-auto pr-1 lg:max-h-152">
                        {tree.length ? renderTree(tree) : <p className="text-sm text-text-dim">Nenhum arquivo corresponde ao filtro.</p>}
                    </div>
                )}
            </aside>

            <section className="bento-card min-h-0">
                <div className="mb-3 flex items-center gap-2 border-b border-border/60 pb-2">
                    <FileText className="size-4 text-primary" />
                    <p className="truncate font-mono text-xs text-text-dim">{payload?.selectedFile ?? selectedFile ?? 'Sem arquivo selecionado'}</p>
                </div>

                {loading ? (
                    <p className="text-sm text-text-dim">Carregando conteudo...</p>
                ) : !payload?.exists ? (
                    <p className="text-sm text-text-dim">Crie a pasta docs no repositorio para visualizar documentacao aqui.</p>
                ) : !payload?.selectedFile ? (
                    <p className="text-sm text-text-dim">Selecione um arquivo .md na lateral.</p>
                ) : (
                    <article className="max-h-[64vh] overflow-y-auto pr-1 text-sm leading-relaxed text-highlight">
                        <div className="space-y-3">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ children }) => <h1 className="mt-2 text-2xl font-bold tracking-tight">{children}</h1>,
                                    h2: ({ children }) => <h2 className="mt-4 text-xl font-bold">{children}</h2>,
                                    h3: ({ children }) => <h3 className="mt-3 text-lg font-semibold">{children}</h3>,
                                    p: ({ children }) => <p className="text-sm text-text-dim">{children}</p>,
                                    code: ({ children }) => <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs text-accent">{children}</code>,
                                    pre: ({ children }) => <pre className="overflow-x-auto rounded-lg border border-border bg-bg p-3 text-xs">{children}</pre>,
                                    ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 text-sm text-text-dim">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 text-sm text-text-dim">{children}</ol>,
                                    blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 italic text-text-dim">{children}</blockquote>,
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/30 hover:decoration-accent">
                                            {children}
                                        </a>
                                    ),
                                }}
                            >
                                {payload.content || '_Arquivo vazio._'}
                            </ReactMarkdown>
                        </div>
                    </article>
                )}
            </section>
        </div>
    );
}
