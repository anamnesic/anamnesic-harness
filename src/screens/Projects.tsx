'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, FileText, GitCommitHorizontal, GitGraph, GitBranch, BookOpen, Lightbulb, RefreshCw, Minus, Undo2, FileCode2, FileJson, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { ProjectContext } from './ProjectContext';
import { DecisionsPanel } from './DecisionsPanel';
import { FolderBrowser } from '@/src/components/FolderBrowser';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { useRepository } from '@/src/context/RepositoryContext';

interface Project {
    id: string;
    name: string;
    description?: string | null;
    status?: string;
    workspaceId?: string | null;
    metadata?: { localPath?: string;[k: string]: any } | null;
    createdAt?: string;
}

function StatusBadge({ status }: { status?: string }) {
    const s = status ?? 'active';
    const colors: Record<string, string> = {
        active: 'bg-green-500/15 text-green-400',
        archived: 'bg-orange-500/15 text-orange-400',
        inactive: 'bg-zinc-500/15 text-zinc-400',
    };
    return (
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', colors[s] ?? colors.inactive)}>
            {s}
        </span>
    );
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    timestamp: string;
}

interface GitChange {
    path: string;
    status: string;
    staged: boolean;
    unstaged: boolean;
    indexStatus: string;
    worktreeStatus: string;
}

interface RepositoryInsights {
    branch: string;
    files: string[];
    changes: GitChange[];
    graphLines: string[];
    isGitRepo: boolean;
}

interface RepositoryTreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: RepositoryTreeNode[];
}

export type ProjectTabId = 'repository' | 'git' | 'context' | 'decisions';

interface ProjectsProps {
    embedded?: boolean;
    refreshToken?: number;
    activeTab?: ProjectTabId;
    onTabChange?: (tab: ProjectTabId) => void;
    hideTabBar?: boolean;
}

export function Projects({
    embedded = false,
    refreshToken = 0,
    activeTab: controlledActiveTab,
    onTabChange,
    hideTabBar = false,
}: ProjectsProps) {
    const { workspace } = useWorkspace();
    const {
        repository,
        setRepositoryById,
        refreshRepositories,
    } = useRepository();
    const projectsQuery = new URLSearchParams();
    if (workspace?.id) {
        projectsQuery.set('workspaceId', workspace.id);
    }
    projectsQuery.set('refresh', String(refreshToken));
    const projectsPath = `/api/v1/projects?${projectsQuery.toString()}`;
    const { data, refetch } = useApi<ApiResponse<Project[]>>(projectsPath);
    const { toast } = useToast();

    const [internalActiveTab, setInternalActiveTab] = useState<ProjectTabId>('repository');
    const [showBrowser, setShowBrowser] = useState(false);
    const [browserMode, setBrowserMode] = useState<'import-repository' | 'attach-folder'>('import-repository');
    const [attachTargetProjectId, setAttachTargetProjectId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [gitBusy, setGitBusy] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [repoQuery, setRepoQuery] = useState('');
    const [selectedRepoFile, setSelectedRepoFile] = useState<string | null>(null);
    const [openRepoTabs, setOpenRepoTabs] = useState<string[]>([]);
    const [repoDraftByFile, setRepoDraftByFile] = useState<Record<string, string>>({});
    const [repoDirtyFiles, setRepoDirtyFiles] = useState<Record<string, boolean>>({});
    const [savingRepoFile, setSavingRepoFile] = useState(false);
    const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
    const [noGitDialog, setNoGitDialog] = useState<{ open: boolean; folderPath: string; folderName: string; gitSubfolders: string[] }>({
        open: false,
        folderPath: '',
        folderName: '',
        gitSubfolders: [],
    });

    const projects = data?.data ?? [];
    const activeTab = controlledActiveTab ?? internalActiveTab;
    const repoTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const repoLineGutterRef = useRef<HTMLDivElement | null>(null);

    function handleTabChange(tab: ProjectTabId) {
        if (!controlledActiveTab) {
            setInternalActiveTab(tab);
        }
        onTabChange?.(tab);
    }

    useEffect(() => {
        if (!projects.length) {
            return;
        }

        if (!repository || !projects.some((project) => project.id === repository.id)) {
            setRepositoryById(projects[0].id);
        }
    }, [projects, repository, setRepositoryById]);

    function joinSubfolder(basePath: string, subfolder: string) {
        const separator = basePath.includes('\\') ? '\\' : '/';
        return `${basePath.replace(/[\\/]$/, '')}${separator}${subfolder}`;
    }

    async function handleFolderSelected(folderPath: string) {
        const base = folderPath.split(/[\\/]/).filter(Boolean).pop() || 'Project';
        setShowBrowser(false);
        setSubmitting(true);
        try {
            const created = await apiFetch<ApiResponse<Project>>('/api/v1/projects', {
                method: 'POST',
                body: JSON.stringify({ name: base, localPath: folderPath }),
            });
            const createdProject = created?.data;
            if (createdProject?.id && typeof window !== 'undefined') {
                localStorage.setItem('kairos-selected-repository', createdProject.id);
            }
            toast(`Repositório "${base}" importado`, 'success');
            await Promise.all([refetch(), refreshRepositories()]);
        } catch (e: any) {
            // Check if it's a NO_GIT_REPO error with git subfolders
            if (e?.code === 'NO_GIT_REPO') {
                const gitSubfolders: string[] = e?.details?.gitSubfolders ?? [];

                if (gitSubfolders.length === 1) {
                    const singleRepoName = gitSubfolders[0];
                    const singleRepoPath = joinSubfolder(folderPath, singleRepoName);

                    const created = await apiFetch<ApiResponse<Project>>('/api/v1/projects', {
                        method: 'POST',
                        body: JSON.stringify({ name: singleRepoName, localPath: singleRepoPath }),
                    });
                    const createdProject = created?.data;
                    if (createdProject?.id && typeof window !== 'undefined') {
                        localStorage.setItem('kairos-selected-repository', createdProject.id);
                    }

                    toast(`A pasta tem 1 repositório Git. "${singleRepoName}" foi importado automaticamente.`, 'success');
                    await Promise.all([refetch(), refreshRepositories()]);
                    return;
                }

                if (gitSubfolders.length === 0) {
                    toast('Esta pasta não tem repositório Git e não pode ser selecionada.', 'error');
                    return;
                }

                setNoGitDialog({
                    open: true,
                    folderPath,
                    folderName: base,
                    gitSubfolders,
                });
                setSubmitting(false);
                return;
            }
            toast(e.message ?? 'Falha ao importar pasta', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAttachFolderToProject(projectId: string, folderPath: string) {
        const project = projects.find((item) => item.id === projectId);
        if (!project) {
            toast('Repositório não encontrado', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const currentMetadata = project.metadata ?? {};
            const additionalPaths = Array.isArray(currentMetadata.additionalPaths)
                ? currentMetadata.additionalPaths.filter((item: unknown): item is string => typeof item === 'string')
                : [];

            const nextPaths = Array.from(new Set([...additionalPaths, folderPath]));
            const nextMetadata = {
                ...currentMetadata,
                additionalPaths: nextPaths,
            };

            await apiFetch(`/api/v1/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify({ metadata: nextMetadata }),
            });

            toast('Pasta adicionada ao repositório', 'success');
            await Promise.all([refetch(), refreshRepositories()]);
        } catch (e: any) {
            toast(e.message ?? 'Falha ao adicionar pasta ao repositório', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleBrowserSelection(path: string) {
        setShowBrowser(false);
        if (browserMode === 'attach-folder' && attachTargetProjectId) {
            await handleAttachFolderToProject(attachTargetProjectId, path);
            setAttachTargetProjectId(null);
            setBrowserMode('import-repository');
            return;
        }

        await handleFolderSelected(path);
    }

    async function handleOpenAsWorkspace() {
        const { folderPath, folderName } = noGitDialog;
        setNoGitDialog({ open: false, folderPath: '', folderName: '', gitSubfolders: [] });
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/workspaces', {
                method: 'POST',
                body: JSON.stringify({
                    name: folderName,
                    slug: folderName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    description: `Workspace with git repositories`,
                }),
            });
            toast(`Criado workspace "${folderName}"`, 'success');
            // Note: In a real app, you might want to navigate to the workspace
        } catch (e: any) {
            toast(e.message ?? 'Falha ao criar workspace', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    const selectedProject = repository && projects.some((p) => p.id === repository.id)
        ? projects.find((p) => p.id === repository.id) || null
        : null;

    const insightsPath = selectedProject ? `/api/v1/projects/${selectedProject.id}/repository-insights` : null;
    const { data: insightsResponse, loading: insightsLoading, refetch: refetchInsights } = useApi<ApiResponse<RepositoryInsights>>(insightsPath);
    const insights = insightsResponse?.data;
    const repositoryFiles = insights?.files ?? [];
    const filteredRepositoryFiles = repositoryFiles.filter((file) => file.toLowerCase().includes(repoQuery.toLowerCase()));

    const repositoryFilePath = selectedProject && selectedRepoFile
        ? `/api/v1/projects/${selectedProject.id}/repository-file?file=${encodeURIComponent(selectedRepoFile)}`
        : null;
    const { data: repositoryFileResponse, loading: repositoryFileLoading, refetch: refetchRepositoryFile } = useApi<ApiResponse<{ selectedFile: string; content: string; size: number }>>(repositoryFilePath);
    const repositoryFile = repositoryFileResponse?.data;

    const currentRepoDraft = selectedRepoFile
        ? (repoDraftByFile[selectedRepoFile] ?? repositoryFile?.content ?? '')
        : '';
    const repoLineCount = Math.max(1, currentRepoDraft.split('\n').length);
    const repoLineNumbers = useMemo(
        () => Array.from({ length: repoLineCount }, (_, i) => i + 1),
        [repoLineCount],
    );

    function openRepoFile(filePath: string) {
        setSelectedRepoFile(filePath);
        setOpenRepoTabs((prev) => (prev.includes(filePath) ? prev : [...prev, filePath]));
    }

    function closeRepoTab(filePath: string) {
        setOpenRepoTabs((prev) => {
            const idx = prev.indexOf(filePath);
            if (idx === -1) return prev;

            const next = prev.filter((f) => f !== filePath);
            if (selectedRepoFile === filePath) {
                if (!next.length) {
                    setSelectedRepoFile(null);
                } else {
                    const fallbackIndex = Math.max(0, idx - 1);
                    setSelectedRepoFile(next[fallbackIndex]);
                }
            }

            return next;
        });
    }

    useEffect(() => {
        if (!selectedProject) {
            setSelectedRepoFile(null);
            setOpenRepoTabs([]);
            setRepoDraftByFile({});
            setRepoDirtyFiles({});
            return;
        }

        if (!repositoryFiles.length) {
            setSelectedRepoFile(null);
            setOpenRepoTabs([]);
            setRepoDraftByFile({});
            setRepoDirtyFiles({});
            return;
        }

        if (!selectedRepoFile || !repositoryFiles.includes(selectedRepoFile)) {
            openRepoFile(repositoryFiles[0]);
        }
    }, [selectedProject?.id, repositoryFiles, selectedRepoFile]);

    useEffect(() => {
        const filePath = repositoryFile?.selectedFile;
        if (!filePath) return;

        setRepoDraftByFile((prev) => {
            const existing = prev[filePath];
            const isDirty = repoDirtyFiles[filePath] ?? false;
            if (existing !== undefined && isDirty) {
                return prev;
            }
            if (existing === repositoryFile.content) {
                return prev;
            }
            return { ...prev, [filePath]: repositoryFile.content };
        });
    }, [repositoryFile?.selectedFile, repositoryFile?.content, repoDirtyFiles]);

    const stagedChanges = insights?.changes?.filter((change) => change.staged) ?? [];
    const unstagedChanges = insights?.changes?.filter((change) => !change.staged) ?? [];

    async function saveRepositoryFile() {
        if (!selectedProject || !selectedRepoFile) return;

        setSavingRepoFile(true);
        try {
            await apiFetch(`/api/v1/projects/${selectedProject.id}/repository-file`, {
                method: 'PUT',
                body: JSON.stringify({
                    file: selectedRepoFile,
                    content: currentRepoDraft,
                }),
            });
            toast('Arquivo salvo com sucesso', 'success');
            setRepoDirtyFiles((prev) => ({ ...prev, [selectedRepoFile]: false }));
            await refetchRepositoryFile();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao salvar arquivo', 'error');
        } finally {
            setSavingRepoFile(false);
        }
    }

    function getFileIcon(filePath: string) {
        const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
        if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) {
            return <FileCode2 className="size-3.5 shrink-0 text-sky-400" />;
        }
        if (['json', 'jsonc'].includes(ext)) {
            return <FileJson className="size-3.5 shrink-0 text-amber-400" />;
        }
        if (['md', 'mdx'].includes(ext)) {
            return <FileText className="size-3.5 shrink-0 text-blue-300" />;
        }
        return <FileText className="size-3.5 shrink-0 text-text-dim" />;
    }

    const repositoryTree = useMemo<RepositoryTreeNode[]>(() => {
        const root = new Map<string, any>();
        const files = filteredRepositoryFiles;

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
    }, [filteredRepositoryFiles]);

    function renderRepositoryTree(nodes: RepositoryTreeNode[], depth = 0): React.ReactNode {
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
                                <Folder className="size-3.5 shrink-0 text-amber-300" />
                            ) : (
                                <FolderOpen className="size-3.5 shrink-0 text-amber-300" />
                            )}
                            <span className="truncate text-xs text-highlight">{node.name}</span>
                        </button>
                        {!isCollapsed && node.children?.length ? renderRepositoryTree(node.children, depth + 1) : null}
                    </div>
                );
            }

            return (
                <button
                    key={node.path}
                    onClick={() => openRepoFile(node.path)}
                    className={cn(
                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card/40',
                        selectedRepoFile === node.path
                            ? 'bg-card text-accent border border-border'
                            : 'text-text-dim hover:text-highlight',
                    )}
                    style={{ paddingLeft: `${26 + depth * 14}px` }}
                    title={node.path}
                >
                    {getFileIcon(node.path)}
                    <span className="truncate font-mono text-xs">{node.name}</span>
                </button>
            );
        });
    }

    const tabItems: Array<{
        id: ProjectTabId;
        label: string;
        icon: typeof FileText;
    }> = [
            { id: 'repository', label: 'Repositório', icon: FileText },
            { id: 'git', label: 'Git', icon: GitBranch },
            { id: 'context', label: 'Docs', icon: BookOpen },
            { id: 'decisions', label: 'Decisões', icon: Lightbulb },
        ];

    async function runGitAction(action: 'stage-all' | 'commit' | 'stage-file' | 'unstage-file' | 'discard-file', path?: string) {
        if (!selectedProject) return;
        if (action === 'commit' && !commitMessage.trim()) {
            toast('Digite uma mensagem de commit', 'error');
            return;
        }

        setGitBusy(true);
        try {
            await apiFetch<ApiResponse<RepositoryInsights>>(`/api/v1/projects/${selectedProject.id}/repository-insights`, {
                method: 'POST',
                body: JSON.stringify({ action, message: commitMessage, path }),
            });
            if (action === 'commit') {
                setCommitMessage('');
                toast('Commit realizado', 'success');
            } else if (action === 'stage-all') {
                toast('Mudanças staged com sucesso', 'success');
            }
            await refetchInsights();
        } catch (e: any) {
            toast(e.message ?? 'Falha na ação de Git', 'error');
        } finally {
            setGitBusy(false);
        }
    }

    const renderRepositoryStartScreen = ({ showWorkspaceHint }: { showWorkspaceHint: boolean }) => (
        <motion.div
            key={showWorkspaceHint ? 'projects-start-no-workspace' : 'projects-start-no-open'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={embedded ? 'w-full' : 'flex-1 w-full max-w-3xl mx-auto p-3 pb-32 sm:p-6'}
        >
            <div className="bento-card py-8 text-center space-y-3">
                <Building2 className="size-8 text-border mx-auto" />
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Nenhum repositório selecionado</h2>
                {showWorkspaceHint ? (
                    <p className="text-sm text-text-dim">Nenhum workspace ativo. Use o seletor de repositórios no appbar para importar uma pasta.</p>
                ) : (
                    <p className="text-sm text-text-dim">Selecione um repositório real no seletor do appbar para carregar arquivos, Git e docs.</p>
                )}
            </div>
        </motion.div>
    );

    const renderSharedModals = () => (
        <>
            <AnimatePresence>
                {noGitDialog.open && (
                    <motion.div
                        key="no-git-dialog-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setNoGitDialog({ ...noGitDialog, open: false }); }}
                    >
                        <motion.div
                            key="no-git-dialog"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            className="bento-card w-full max-w-md space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Nenhum repositório Git encontrado</h3>
                                <button
                                    onClick={() => setNoGitDialog({ ...noGitDialog, open: false })}
                                    className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="space-y-2 text-sm text-text-dim">
                                <p>
                                    <span className="font-semibold text-text">{noGitDialog.folderName}</span> doesn't have a git repository, but found {noGitDialog.gitSubfolders.length} git repositor{noGitDialog.gitSubfolders.length === 1 ? 'y' : 'ies'} in subfolders:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-xs font-mono">
                                    {noGitDialog.gitSubfolders.map((folder, i) => (
                                        <li key={i}>{folder}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setNoGitDialog({ ...noGitDialog, open: false })}
                                    className="flex-1 rounded-lg border border-border px-4 py-2 text-xs font-bold text-text-dim hover:text-text transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleOpenAsWorkspace}
                                    disabled={submitting}
                                    className="flex-1 rounded-lg bg-accent/20 border border-accent/40 px-4 py-2 text-xs font-bold text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Creating…' : 'Open as Workspace'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showBrowser && (
                    <FolderBrowser
                        onClose={() => setShowBrowser(false)}
                        onSelect={handleBrowserSelection}
                    />
                )}
            </AnimatePresence>
        </>
    );

    if (selectedProject) {
        return (
            <>
                <motion.div
                    key="project-detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={embedded ? 'w-full' : 'flex-1 w-full max-w-6xl mx-auto p-3 pb-32 sm:p-6'}
                >
                    <div className="space-y-3">
                        {!hideTabBar && (
                            <aside className="bento-card p-1.5">
                                <div className="flex items-center gap-1">
                                    {tabItems.map((tab) => {
                                        const Icon = tab.icon;
                                        const isActive = activeTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                title={tab.label}
                                                aria-label={tab.label}
                                                onClick={() => handleTabChange(tab.id)}
                                                className={cn(
                                                    'relative rounded-md p-2 transition-colors',
                                                    isActive
                                                        ? 'text-accent bg-card/70'
                                                        : 'text-text-dim hover:text-highlight hover:bg-card/40',
                                                )}
                                            >
                                                <Icon className="size-4" />
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeTab"
                                                        className="absolute -bottom-1 left-1 right-1 h-0.5 bg-primary"
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>
                        )}

                        <section className="min-w-0">
                            {activeTab === 'repository' ? (
                                <div className="space-y-3">
                                    <div className="sticky top-20 z-20 overflow-x-auto rounded-lg border border-border/60 bg-bg/90 backdrop-blur">
                                        <div className="flex items-stretch">
                                            {openRepoTabs.length ? openRepoTabs.map((filePath) => {
                                                const isActive = selectedRepoFile === filePath;
                                                const isDirty = repoDirtyFiles[filePath] ?? false;
                                                const fileName = filePath.split('/').pop() || filePath;

                                                return (
                                                    <button
                                                        key={filePath}
                                                        onClick={() => setSelectedRepoFile(filePath)}
                                                        className={cn(
                                                            'group flex max-w-56 shrink-0 items-center gap-2 border-r border-border/60 px-3 py-2 text-xs transition-colors',
                                                            isActive
                                                                ? 'bg-card text-highlight'
                                                                : 'text-text-dim hover:bg-card/40 hover:text-highlight',
                                                        )}
                                                        title={filePath}
                                                    >
                                                        {getFileIcon(filePath)}
                                                        <span className="truncate font-mono">{fileName}</span>
                                                        {isDirty && <span className="text-primary">●</span>}
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                closeRepoTab(filePath);
                                                            }}
                                                            className="rounded p-0.5 text-text-dim opacity-70 transition hover:bg-card hover:opacity-100"
                                                        >
                                                            <X className="size-3" />
                                                        </span>
                                                    </button>
                                                );
                                            }) : (
                                                <div className="px-3 py-2 text-xs text-text-dim">Nenhum arquivo aberto</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid min-h-128 grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
                                        <aside className="bento-card min-h-0">
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Folder className="size-4 text-primary" />
                                                    <p className="label-caps">Repo</p>
                                                </div>
                                                <button
                                                    onClick={() => void refetchInsights()}
                                                    className="rounded-md border border-border px-2 py-1 text-[10px] font-bold text-text-dim hover:text-accent transition-colors"
                                                >
                                                    Refresh
                                                </button>
                                            </div>

                                            <input
                                                value={repoQuery}
                                                onChange={(e) => setRepoQuery(e.target.value)}
                                                placeholder="Filtrar arquivos"
                                                className="mb-3 w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-highlight placeholder:text-text-dim focus:border-primary/60 outline-none transition-colors"
                                            />

                                            {insightsLoading ? (
                                                <p className="text-sm text-text-dim">Carregando arquivos...</p>
                                            ) : !insights?.isGitRepo ? (
                                                <p className="text-sm text-text-dim">Pasta sem repositório Git válido.</p>
                                            ) : !repositoryFiles.length ? (
                                                <p className="text-sm text-text-dim">Nenhum arquivo encontrado.</p>
                                            ) : (
                                                <div className="max-h-96 space-y-1 overflow-y-auto pr-1 lg:max-h-152">
                                                    {repositoryTree.length
                                                        ? renderRepositoryTree(repositoryTree)
                                                        : <p className="text-sm text-text-dim">Nenhum arquivo corresponde ao filtro.</p>}
                                                </div>
                                            )}
                                        </aside>

                                        <section className="min-h-0 overflow-hidden">

                                            {insightsLoading ? (
                                                <p className="text-sm text-text-dim">Carregando editor...</p>
                                            ) : !insights?.isGitRepo ? (
                                                <p className="text-sm text-text-dim">Pasta sem repositório Git válido.</p>
                                            ) : !selectedRepoFile ? (
                                                <p className="text-sm text-text-dim">Selecione um arquivo na lateral.</p>
                                            ) : repositoryFileLoading ? (
                                                <p className="text-sm text-text-dim">Carregando conteúdo...</p>
                                            ) : (
                                                <div className="h-[calc(100vh-19rem)] min-h-[22rem] overflow-hidden border border-border/60 bg-bg/80">
                                                    <div className="flex h-full">
                                                        <div
                                                            ref={repoLineGutterRef}
                                                            className="w-14 shrink-0 overflow-hidden border-r border-border/60 bg-card/40 px-2 py-3 text-right font-mono text-[11px] leading-relaxed text-text-dim"
                                                        >
                                                            {repoLineNumbers.map((lineNumber) => (
                                                                <div key={lineNumber}>{lineNumber}</div>
                                                            ))}
                                                        </div>
                                                        <textarea
                                                            ref={repoTextareaRef}
                                                            value={currentRepoDraft}
                                                            onChange={(e) => {
                                                                if (!selectedRepoFile) return;
                                                                const nextDraft = e.target.value;
                                                                const baseContent = repositoryFile?.content ?? '';
                                                                setRepoDraftByFile((prev) => ({ ...prev, [selectedRepoFile]: nextDraft }));
                                                                setRepoDirtyFiles((prev) => ({
                                                                    ...prev,
                                                                    [selectedRepoFile]: nextDraft !== baseContent,
                                                                }));
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                                                                    e.preventDefault();
                                                                    if (!savingRepoFile) {
                                                                        void saveRepositoryFile();
                                                                    }
                                                                }
                                                            }}
                                                            onScroll={(e) => {
                                                                if (repoLineGutterRef.current) {
                                                                    repoLineGutterRef.current.scrollTop = e.currentTarget.scrollTop;
                                                                }
                                                            }}
                                                            spellCheck={false}
                                                            className="h-full flex-1 resize-none bg-transparent px-3 py-3 font-mono text-xs leading-relaxed text-highlight outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                </div>
                            ) : activeTab === 'git' ? (
                                <div className="bento-card">
                                    <div className="bento-card min-h-64 min-w-0 rounded-2xl sm:min-h-72">
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <GitBranch className="size-4 text-primary" />
                                                <p className="label-caps">Source control</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {insights?.branch && (
                                                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-text-dim">
                                                        {insights.branch}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => void refetchInsights()}
                                                    disabled={insightsLoading || gitBusy}
                                                    title="Atualizar"
                                                    className="rounded-md border border-border p-1 text-text-dim hover:text-accent transition-colors disabled:opacity-50"
                                                >
                                                    <RefreshCw className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 border-b border-border/60 pb-4">
                                            <input
                                                value={commitMessage}
                                                onChange={(e) => setCommitMessage(e.target.value)}
                                                placeholder="Message (Ctrl+Enter para commit)"
                                                onKeyDown={(e) => {
                                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                        e.preventDefault();
                                                        void runGitAction('commit');
                                                    }
                                                }}
                                                className="w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-highlight placeholder:text-text-dim focus:border-primary/60 outline-none transition-colors"
                                            />
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => void runGitAction('commit')}
                                                    disabled={insightsLoading || gitBusy || !insights?.isGitRepo || !stagedChanges.length || !commitMessage.trim()}
                                                    className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                >
                                                    Commit
                                                </button>
                                                <button
                                                    onClick={() => void runGitAction('stage-all')}
                                                    disabled={insightsLoading || gitBusy || !insights?.isGitRepo}
                                                    className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-accent hover:border-primary/60 transition-colors disabled:opacity-50"
                                                >
                                                    Stage all
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="label-caps">Changes</p>
                                                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-accent">
                                                    {insights?.changes?.length ?? 0}
                                                </span>
                                            </div>
                                            {insightsLoading ? (
                                                <p className="text-sm text-text-dim">Carregando mudanças...</p>
                                            ) : !insights?.isGitRepo ? (
                                                <p className="text-sm text-text-dim">Pasta sem repositório Git válido.</p>
                                            ) : insights?.changes?.length ? (
                                                <div className="max-h-56 space-y-1 overflow-y-auto pr-1 sm:max-h-72">
                                                    {insights.changes.map((change, index) => (
                                                        <div key={`${change.path}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate font-mono text-xs text-text-dim">{change.path}</p>
                                                                <p className="text-[10px] text-text-dim/70">
                                                                    index:{change.indexStatus} worktree:{change.worktreeStatus}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className={cn(
                                                                    'shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                                                                    change.staged ? 'bg-green-500/15 text-green-400' : 'bg-zinc-500/20 text-zinc-300',
                                                                )}>
                                                                    {change.status}
                                                                </span>
                                                                {change.unstaged && (
                                                                    <button
                                                                        title="Stage arquivo"
                                                                        onClick={() => void runGitAction('stage-file', change.path)}
                                                                        disabled={gitBusy || insightsLoading}
                                                                        className="rounded border border-border p-1 text-text-dim hover:text-accent transition-colors disabled:opacity-50"
                                                                    >
                                                                        <GitCommitHorizontal className="size-3" />
                                                                    </button>
                                                                )}
                                                                {change.staged && (
                                                                    <button
                                                                        title="Unstage arquivo"
                                                                        onClick={() => void runGitAction('unstage-file', change.path)}
                                                                        disabled={gitBusy || insightsLoading}
                                                                        className="rounded border border-border p-1 text-text-dim hover:text-accent transition-colors disabled:opacity-50"
                                                                    >
                                                                        <Minus className="size-3" />
                                                                    </button>
                                                                )}
                                                                {change.unstaged && (
                                                                    <button
                                                                        title="Descartar mudanças"
                                                                        onClick={() => void runGitAction('discard-file', change.path)}
                                                                        disabled={gitBusy || insightsLoading}
                                                                        className="rounded border border-border p-1 text-text-dim hover:text-red-400 transition-colors disabled:opacity-50"
                                                                    >
                                                                        <Undo2 className="size-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-text-dim">Sem mudanças pendentes.</p>
                                            )}
                                        </div>

                                        <div className="mt-5 border-t border-border/60 pt-4">
                                            <div className="mb-2 flex items-center gap-2">
                                                <GitGraph className="size-4 text-primary" />
                                                <p className="label-caps">Graph</p>
                                            </div>
                                            {insightsLoading ? (
                                                <p className="text-sm text-text-dim">Carregando histórico...</p>
                                            ) : !insights?.isGitRepo ? (
                                                <p className="text-sm text-text-dim">Pasta sem repositório Git válido.</p>
                                            ) : insights?.graphLines?.length ? (
                                                <pre className="max-h-56 overflow-y-auto whitespace-pre font-mono text-[10px] text-text-dim sm:max-h-72 sm:text-[11px]">
                                                    {insights.graphLines.join('\n')}
                                                </pre>
                                            ) : (
                                                <p className="text-sm text-text-dim">Sem histórico disponível.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : activeTab === 'context' ? (
                                <ProjectContext projectId={selectedProject.id} />
                            ) : (
                                <DecisionsPanel projectId={selectedProject.id} />
                            )}
                        </section>
                    </div>
                </motion.div>
                {renderSharedModals()}
            </>
        );
    }

    return (
        <div className={embedded ? 'w-full' : 'flex-1'}>
            {renderRepositoryStartScreen({ showWorkspaceHint: !workspace })}
            {renderSharedModals()}
        </div>
    );
}
