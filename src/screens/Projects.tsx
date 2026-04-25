'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, FolderOpen, ArrowLeft } from 'lucide-react';
import { ProjectContext } from './ProjectContext';
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

export function Projects() {
    const { data, loading, refetch } = useApi<Project[]>('/api/v1/projects');
    const { toast } = useToast();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    function closeModal() {
        setShowModal(false);
        setName('');
        setDescription('');
    }

    async function handleSubmit() {
        if (!name.trim()) { toast('Name is required', 'error'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/projects', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
            });
            toast('Project created', 'success');
            refetch();
            closeModal();
        } catch (e: any) {
            toast(e.message ?? 'Failed to create project', 'error');
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

    const projects = data ?? [];
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
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                >
                    <Plus className="size-3.5" />
                    New Project
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
                            {project.workspaceId && (
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
                {showModal && (
                    <motion.div
                        key="project-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                    >
                        <motion.div
                            key="project-modal"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            className="bento-card w-full max-w-md space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">New Project</h3>
                                <button onClick={closeModal} className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors">
                                    <X className="size-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="label-caps block mb-1">Name</label>
                                    <input
                                        className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                                        placeholder="My Project"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="label-caps block mb-1">Description</label>
                                    <textarea
                                        rows={3}
                                        className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent placeholder-text-dim focus:outline-none focus:border-primary resize-none"
                                        placeholder="Optional description…"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-text-dim hover:text-accent transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 rounded-xl bg-highlight py-3 text-sm font-bold text-bg hover:bg-accent transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
