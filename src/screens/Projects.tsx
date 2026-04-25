'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, FolderOpen, ArrowLeft, FolderGit2, X } from 'lucide-react';
import { ProjectContext } from './ProjectContext';
import { FolderBrowser } from '@/src/components/FolderBrowser';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

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
    const { data, loading, refetch } = useApi<ApiResponse<Project[]>>('/api/v1/projects');
    const { toast } = useToast();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showBrowser, setShowBrowser] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [noGitDialog, setNoGitDialog] = useState<{ open: boolean; folderPath: string; folderName: string; gitSubfolders: string[] }>({
        open: false,
        folderPath: '',
        folderName: '',
        gitSubfolders: [],
    });

    async function handleFolderSelected(folderPath: string) {
        const base = folderPath.split(/[\\/]/).filter(Boolean).pop() || 'Project';
        setShowBrowser(false);
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/projects', {
                method: 'POST',
                body: JSON.stringify({ name: base, localPath: folderPath }),
            });
            toast(`Imported "${base}"`, 'success');
            refetch();
        } catch (e: any) {
            // Check if it's a NO_GIT_REPO error with git subfolders
            if (e?.code === 'NO_GIT_REPO' && e?.details?.gitSubfolders?.length > 0) {
                setNoGitDialog({
                    open: true,
                    folderPath,
                    folderName: base,
                    gitSubfolders: e.details.gitSubfolders,
                });
                setSubmitting(false);
                return;
            }
            toast(e.message ?? 'Failed to import folder', 'error');
        } finally {
            setSubmitting(false);
        }
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
            toast(`Created workspace "${folderName}"`, 'success');
            // Note: In a real app, you might want to navigate to the workspace
        } catch (e: any) {
            toast(e.message ?? 'Failed to create workspace', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        setDeleting(id);
        try {
            await apiFetch(`/api/v1/projects/${id}`, { method: 'DELETE' });
            toast('Project deleted', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Failed to delete project', 'error');
        } finally {
            setDeleting(null);
        }
    }

    const projects = data?.data ?? [];
    const selectedProject = projects.find(p => p.id === selectedProjectId);

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
                    Back to Projects
                </button>
                <div className="bento-card space-y-2 mb-2">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-accent text-lg">{selectedProject.name}</span>
                        <StatusBadge status={selectedProject.status} />
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
                </div>
                <ProjectContext projectId={selectedProject.id} />
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
                <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
                <button
                    onClick={() => setShowBrowser(true)}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors disabled:opacity-50"
                >
                    <FolderOpen className="size-3.5" />
                    {submitting ? 'Importing…' : 'Select Folder'}
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <FolderOpen className="size-10 text-border" />
                    <p className="text-text-dim text-sm">No projects yet</p>
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
                                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                        disabled={deleting === project.id}
                                        className="rounded-lg p-1.5 text-text-dim hover:text-red-400 transition-colors disabled:opacity-40"
                                        aria-label="Delete project"
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
                                <h3 className="text-lg font-bold">No Git Repository Found</h3>
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
                        onSelect={handleFolderSelected}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
