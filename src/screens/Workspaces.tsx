'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Building2 } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface Workspace {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    status?: string;
    createdAt?: string;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

function StatusBadge({ status }: { status?: string }) {
    const s = status ?? 'active';
    const colors: Record<string, string> = {
        active: 'bg-green-500/15 text-green-400',
        inactive: 'bg-zinc-500/15 text-zinc-400',
        archived: 'bg-orange-500/15 text-orange-400',
    };
    return (
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', colors[s] ?? colors.active)}>
            {s}
        </span>
    );
}

export function Workspaces() {
    const { data, loading, refetch } = useApi<Workspace[]>('/api/v1/workspaces');
    const { toast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function handleNameChange(value: string) {
        setName(value);
        setSlug(slugify(value));
    }

    function closeModal() {
        setShowModal(false);
        setName('');
        setSlug('');
        setDescription('');
    }

    async function handleSubmit() {
        if (!name.trim()) { toast('Name is required', 'error'); return; }
        if (!slug.trim()) { toast('Slug is required', 'error'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/workspaces', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), slug: slug.trim(), description: description.trim() || undefined }),
            });
            toast('Workspace created', 'success');
            refetch();
            closeModal();
        } catch (e: any) {
            toast(e.message ?? 'Failed to create workspace', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    const workspaces = data ?? [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
        >
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Workspaces</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                >
                    <Plus className="size-3.5" />
                    New Workspace
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <Building2 className="size-10 text-border" />
                    <p className="text-text-dim text-sm">No workspaces yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {workspaces.map(ws => (
                        <div key={ws.id} className="bento-card space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <span className="font-bold text-accent">{ws.name}</span>
                                <StatusBadge status={ws.status} />
                            </div>
                            <code className="text-xs text-text-dim font-mono">{ws.slug}</code>
                            {ws.description && (
                                <p className="text-sm text-text-dim leading-relaxed">{ws.description}</p>
                            )}
                            {ws.createdAt && (
                                <p className="label-caps">{new Date(ws.createdAt).toLocaleDateString()}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        key="workspace-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                    >
                        <motion.div
                            key="workspace-modal"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            className="bento-card w-full max-w-md space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">New Workspace</h3>
                                <button onClick={closeModal} className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors">
                                    <X className="size-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="label-caps block mb-1">Name</label>
                                    <input
                                        className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                                        placeholder="My Workspace"
                                        value={name}
                                        onChange={e => handleNameChange(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="label-caps block mb-1">Slug</label>
                                    <input
                                        className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-mono text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                                        placeholder="my-workspace"
                                        value={slug}
                                        onChange={e => setSlug(slugify(e.target.value))}
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
