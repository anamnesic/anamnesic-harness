'use client';

import { useEffect } from 'react';
import { Building2, ChevronDown, ChevronRight, FileCode2, FileJson, FileText, Folder, FolderOpen } from 'lucide-react';
import { useApi } from '@/src/lib/api';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { useRepository } from '@/src/context/RepositoryContext';

export interface Project {
    id: string;
    name: string;
    description?: string | null;
    status?: string;
    workspaceId?: string | null;
    metadata?: { localPath?: string;[k: string]: any } | null;
    createdAt?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    timestamp: string;
}

export interface GitChange {
    path: string;
    status: string;
    staged: boolean;
    unstaged: boolean;
    indexStatus: string;
    worktreeStatus: string;
}

export interface RepositoryInsights {
    branch: string;
    files: string[];
    changes: GitChange[];
    graphLines: string[];
    isGitRepo: boolean;
}

export interface RepositoryTreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: RepositoryTreeNode[];
}

export function useSelectedProjectState(refreshToken = 0) {
    const { workspace } = useWorkspace();
    const { repository, setRepositoryById } = useRepository();

    const projectsQuery = new URLSearchParams();
    if (workspace?.id) {
        projectsQuery.set('workspaceId', workspace.id);
    }
    projectsQuery.set('refresh', String(refreshToken));

    const projectsPath = `/api/v1/projects?${projectsQuery.toString()}`;
    const { data, refetch } = useApi<ApiResponse<Project[]>>(projectsPath);
    const projects = data?.data ?? [];

    useEffect(() => {
        if (!projects.length) {
            return;
        }

        if (!repository || !projects.some((project) => project.id === repository.id)) {
            setRepositoryById(projects[0].id);
        }
    }, [projects, repository, setRepositoryById]);

    const selectedProject = repository && projects.some((project) => project.id === repository.id)
        ? projects.find((project) => project.id === repository.id) ?? null
        : null;

    return {
        workspace,
        repository,
        projects,
        selectedProject,
        refetchProjects: refetch,
    };
}

export function useProjectInsights(projectId?: string | null) {
    const insightsPath = projectId ? `/api/v1/projects/${projectId}/repository-insights` : null;
    const { data, loading, refetch } = useApi<ApiResponse<RepositoryInsights>>(insightsPath);

    return {
        insights: data?.data,
        insightsLoading: loading,
        refetchInsights: refetch,
    };
}

export function getFileIcon(filePath: string) {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
        return <FileCode2 className="size-3.5 shrink-0 text-sky-400" />;
    }
    if (['json', 'jsonc'].includes(ext)) {
        return <FileJson className="size-3.5 shrink-0 text-stone-200" />;
    }
    if (['md', 'mdx'].includes(ext)) {
        return <FileText className="size-3.5 shrink-0 text-blue-300" />;
    }
    return <FileText className="size-3.5 shrink-0 text-text-dim" />;
}

export function buildRepositoryTree(files: string[]): RepositoryTreeNode[] {
    const root = new Map<string, any>();

    for (const filePath of files) {
        const normalized = filePath.replace(/\\/g, '/');
        const parts = normalized.split('/').filter(Boolean);
        let cursor = root;
        let parentPath = '';

        for (let i = 0; i < parts.length; i += 1) {
            const part = parts[i];
            const currentPath = parentPath ? `${parentPath}/${part}` : part;
            const isFile = i === parts.length - 1;
            const existing = cursor.get(part);

            if (!existing) {
                if (isFile) {
                    cursor.set(part, {
                        name: part,
                        path: currentPath,
                        type: 'file',
                    });
                } else {
                    const nextChildren = new Map<string, any>();
                    cursor.set(part, {
                        name: part,
                        path: currentPath,
                        type: 'folder',
                        childrenMap: nextChildren,
                    });
                    cursor = nextChildren;
                }
            } else if (existing.type === 'folder') {
                cursor = existing.childrenMap;
            }

            parentPath = currentPath;
        }
    }

    const toNodes = (childrenMap: Map<string, any>): RepositoryTreeNode[] => {
        const values = Array.from(childrenMap.values());
        values.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        return values.map((node) => {
            if (node.type === 'folder') {
                return {
                    name: node.name,
                    path: node.path,
                    type: 'folder',
                    children: toNodes(node.childrenMap),
                };
            }

            return {
                name: node.name,
                path: node.path,
                type: 'file',
            };
        });
    };

    return toNodes(root);
}

export function RepositoryTreeView({
    nodes,
    collapsedFolders,
    onToggleFolder,
    depth = 0,
}: {
    nodes: RepositoryTreeNode[];
    collapsedFolders: Record<string, boolean>;
    onToggleFolder: (path: string) => void;
    depth?: number;
}) {
    return (
        <>
            {nodes.map((node) => {
                if (node.type === 'folder') {
                    const isCollapsed = collapsedFolders[node.path] === true;

                    return (
                        <div key={node.path}>
                            <button
                                onClick={() => onToggleFolder(node.path)}
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
                            {!isCollapsed && node.children?.length ? (
                                <RepositoryTreeView
                                    nodes={node.children}
                                    collapsedFolders={collapsedFolders}
                                    onToggleFolder={onToggleFolder}
                                    depth={depth + 1}
                                />
                            ) : null}
                        </div>
                    );
                }

                return (
                    <div
                        key={node.path}
                        className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-card/40"
                        style={{ paddingLeft: `${26 + depth * 14}px` }}
                        title={node.path}
                    >
                        {getFileIcon(node.path)}
                        <span className="truncate text-xs text-highlight">{node.name}</span>
                    </div>
                );
            })}
        </>
    );
}

export function RepositorySelectionEmptyState({ showWorkspaceHint }: { showWorkspaceHint: boolean }) {
    return (
        <div className="bento-card py-8 text-center space-y-3">
            <Building2 className="mx-auto size-8 text-border" />
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Nenhum repositório selecionado</h2>
            {showWorkspaceHint ? (
                <p className="text-sm text-text-dim">Nenhum workspace ativo. Use o seletor de repositórios no appbar para importar uma pasta.</p>
            ) : (
                <p className="text-sm text-text-dim">Selecione um repositório real no seletor do appbar para carregar arquivos, Git e contexto.</p>
            )}
        </div>
    );
}
