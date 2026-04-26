'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, FolderOpen, ArrowLeft, FolderGit2, X, Pencil, Building2 } from 'lucide-react';
import { ProjectContext } from './ProjectContext';
import { DecisionsPanel } from './DecisionsPanel';
import { FolderBrowser } from '@/src/components/FolderBrowser';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';

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

export function Projects() {
    const { workspace } = useWorkspace();
    const projectsPath = workspace?.id ? `/api/v1/projects?workspaceId=${workspace.id}` : null;
    const { data, loading, refetch } = useApi<ApiResponse<Project[]>>(projectsPath);
    const { toast } = useToast();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'context' | 'decisions'>('context');
    const [showBrowser, setShowBrowser] = useState(false);
    const [browserMode, setBrowserMode] = useState<'import-repository' | 'attach-folder'>('import-repository');
    const [attachTargetProjectId, setAttachTargetProjectId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editForm, setEditForm] = useState({ name: '', description: '', status: 'active' });
    const [noGitDialog, setNoGitDialog] = useState<{ open: boolean; folderPath: string; folderName: string; gitSubfolders: string[] }>({
        open: false,
        folderPath: '',
        folderName: '',
        gitSubfolders: [],
    });

    function joinSubfolder(basePath: string, subfolder: string) {
        const separator = basePath.includes('\\') ? '\\' : '/';
        return `${basePath.replace(/[\\/]$/, '')}${separator}${subfolder}`;
    }

    async function handleFolderSelected(folderPath: string) {
        const base = folderPath.split(/[\\/]/).filter(Boolean).pop() || 'Project';
        setShowBrowser(false);
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/projects', {
                method: 'POST',
                body: JSON.stringify({ name: base, localPath: folderPath }),
            });
            toast(`Repositório "${base}" importado`, 'success');
            refetch();
        } catch (e: any) {
            // Check if it's a NO_GIT_REPO error with git subfolders
            if (e?.code === 'NO_GIT_REPO') {
                const gitSubfolders: string[] = e?.details?.gitSubfolders ?? [];

                if (gitSubfolders.length === 1) {
                    const singleRepoName = gitSubfolders[0];
                    const singleRepoPath = joinSubfolder(folderPath, singleRepoName);

                    await apiFetch('/api/v1/projects', {
                        method: 'POST',
                        body: JSON.stringify({ name: singleRepoName, localPath: singleRepoPath }),
                    });

                    toast(`A pasta tem 1 repositório Git. "${singleRepoName}" foi importado automaticamente.`, 'success');
                    refetch();
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
            refetch();
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

    async function handleEdit() {
        if (!editingProject) return;
        setSubmitting(true);
        try {
            await apiFetch(`/api/v1/projects/${editingProject.id}`, {
                method: 'PUT',
                body: JSON.stringify(editForm),
            });
            toast('Repositório atualizado', 'success');
            setEditingProject(null);
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao atualizar projeto', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        setDeleting(id);
        try {
            await apiFetch(`/api/v1/projects/${id}`, { method: 'DELETE' });
            toast('Repositório excluído', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao excluir projeto', 'error');
        } finally {
            setDeleting(null);
        }
    }

    const projects = data?.data ?? [];
    const selectedProject = projects.find(p => p.id === selectedProjectId);

    if (!workspace) {
        return (
            <motion.div
                key="projects-no-workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
            >
                <div className="bento-card py-16 text-center space-y-3">
                    <Building2 className="size-10 text-border mx-auto" />
                    <h3 className="font-bold text-accent">Selecione um workspace</h3>
                    <p className="text-sm text-text-dim">Escolha um workspace para visualizar seus repositórios.</p>
                </div>
            </motion.div>
        );
    }

    if (selectedProject) {
        return (
            <motion.div
                key="project-detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
            >
                <button
                    onClick={() => setSelectedProjectId(null)}
                    className="flex items-center gap-2 text-sm text-text-dim hover:text-accent transition-colors mb-6"
                >
                    <ArrowLeft className="size-4" />
                    Voltar para Repositórios
                </button>
                <div className="bento-card space-y-2 mb-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-accent text-lg">{selectedProject.name}</span>
                            <StatusBadge status={selectedProject.status} />
                        </div>
                        <button
                            onClick={() => {
                                setAttachTargetProjectId(selectedProject.id);
                                setBrowserMode('attach-folder');
                                setShowBrowser(true);
                            }}
                            disabled={submitting}
                            className="flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-1.5 text-[11px] font-bold text-accent hover:border-primary/60 transition-colors disabled:opacity-50"
                        >
                            <FolderOpen className="size-3.5" />
                            {submitting ? 'Adicionando…' : 'Adicionar pasta'}
                        </button>
                    </div>
                    {selectedProject.description && (
                        <p className="text-sm text-text-dim leading-relaxed">{selectedProject.description}</p>
                    )}
                    {selectedProject.metadata?.localPath && (
                        <div className="flex items-center gap-2 text-xs text-text-dim font-mono">
                            <FolderGit2 className="size-3.5 text-primary shrink-0" />
                            <span className="truncate">{selectedProject.metadata.localPath}</span>
                        </div>
                    )}
                    {Array.isArray(selectedProject.metadata?.additionalPaths) && selectedProject.metadata.additionalPaths.length > 0 && (
                        <div className="space-y-1">
                            <p className="label-caps">Pastas adicionais</p>
                            {selectedProject.metadata.additionalPaths.map((folderPath: string, index: number) => (
                                <div key={`${folderPath}-${index}`} className="flex items-center gap-2 text-xs text-text-dim font-mono">
                                    <FolderOpen className="size-3.5 text-primary shrink-0" />
                                    <span className="truncate">{folderPath}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 border-b border-border mb-6">
                    <button
                        onClick={() => setActiveTab('context')}
                        className={cn(
                            'pb-3 text-sm font-bold transition-colors relative',
                            activeTab === 'context' ? 'text-accent' : 'text-text-dim hover:text-highlight'
                        )}
                    >
                        Context
                        {activeTab === 'context' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('decisions')}
                        className={cn(
                            'pb-3 text-sm font-bold transition-colors relative',
                            activeTab === 'decisions' ? 'text-accent' : 'text-text-dim hover:text-highlight'
                        )}
                    >
                        Decisões
                        {activeTab === 'decisions' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                            />
                        )}
                    </button>
                </div>

                <div className="mt-4">
                    {activeTab === 'context' ? (
                        <ProjectContext projectId={selectedProject.id} />
                    ) : (
                        <DecisionsPanel projectId={selectedProject.id} />
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            key="projects-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
        >
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Repositórios</h2>
                <button
                    onClick={() => {
                        setAttachTargetProjectId(null);
                        setBrowserMode('import-repository');
                        setShowBrowser(true);
                    }}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors disabled:opacity-50"
                >
                    <FolderOpen className="size-3.5" />
                    {submitting ? 'Importando…' : 'Importar Repositório'}
                </button>
            </div>

            <p className="text-xs text-text-dim -mt-5 mb-6">Workspace ativo: {workspace.name}</p>

            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <FolderOpen className="size-10 text-border" />
                    <p className="text-text-dim text-sm">Ainda não há repositórios neste workspace</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {projects.map(project => (
                        <div
                            key={project.id}
                            className="bento-card space-y-2 cursor-pointer hover:border-primary/60 transition-colors"
                            onClick={() => setSelectedProjectId(project.id)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span className="font-bold text-accent">{project.name}</span>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={project.status} />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingProject(project);
                                            setEditForm({
                                                name: project.name,
                                                description: project.description || '',
                                                status: project.status || 'active'
                                            });
                                        }}
                                        className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors"
                                        aria-label="Editar repositório"
                                    >
                                        <Pencil className="size-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                        disabled={deleting === project.id}
                                        className="rounded-lg p-1.5 text-text-dim hover:text-red-400 transition-colors disabled:opacity-40"
                                        aria-label="Excluir repositório"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                            {project.description && (
                                <p className="text-sm text-text-dim leading-relaxed">{project.description}</p>
                            )}
                            {project.metadata?.localPath && (
                                <div className="flex items-center gap-2 text-xs text-text-dim font-mono truncate">
                                    <FolderGit2 className="size-3.5 text-primary shrink-0" />
                                    <span className="truncate">{project.metadata.localPath}</span>
                                </div>
                            )}
                            {!project.metadata?.localPath && project.workspaceId && (
                                <p className="text-xs text-text-dim font-mono truncate">{project.workspaceId}</p>
                            )}
                            {project.createdAt && (
                                <p className="label-caps">{new Date(project.createdAt).toLocaleDateString()}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

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
                {editingProject && (
                    <motion.div
                        key="edit-project-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setEditingProject(null); }}
                    >
                        <motion.div
                            key="edit-project-modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bento-card w-full max-w-md space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Editar Repositório</h3>
                                <button
                                    onClick={() => setEditingProject(null)}
                                    className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="label-caps block mb-1">Nome</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm focus:border-primary/60 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="label-caps block mb-1">Descrição</label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm focus:border-primary/60 outline-none transition-colors min-h-20"
                                    />
                                </div>
                                <div>
                                    <label className="label-caps block mb-1">Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm focus:border-primary/60 outline-none transition-colors"
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="archived">Arquivado</option>
                                        <option value="inactive">Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={() => setEditingProject(null)}
                                    className="flex-1 rounded-lg border border-border px-4 py-2 text-xs font-bold text-text-dim hover:text-text transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleEdit}
                                    disabled={submitting}
                                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Salvando…' : 'Salvar alterações'}
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
        </motion.div>
    );
}
