'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Trash2, Camera, RotateCcw } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface Snapshot {
    id: string;
    name: string;
    description: string;
    scope: string;
    createdAt: string;
    fileCount?: number;
    totalSize?: number;
    workspaceRoot?: string;
    files?: Array<{
        path: string;
        hash: string;
        size: number;
        modified: string;
    }>;
}

function formatRelative(iso: string): string {
    try {
        const then = new Date(iso).getTime();
        const diff = Date.now() - then;
        if (diff < 60_000) return 'just now';
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
        return `${Math.floor(diff / 86_400_000)}d ago`;
    } catch {
        return iso;
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function getScopeColor(scope: string): string {
    switch (scope) {
        case 'system': return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
        case 'src': return 'bg-green-500/15 text-green-400 border border-green-500/30';
        case 'config': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
        default: return 'bg-primary/15 text-primary border border-primary/30';
    }
}

export function Snapshots() {
    const { data, loading, refetch } = useApi<any>('/api/v1/snapshots');
    const { toast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [scope, setScope] = useState('system');

    const items: Snapshot[] = (data as any)?.data ?? data ?? [];
    const list = Array.isArray(items) ? items : [];

    function closeModal() {
        setShowModal(false);
        setName('');
        setDescription('');
        setScope('system');
    }

    async function handleCreate() {
        if (!name.trim()) {
            toast('Nome é obrigatório', 'error');
            return;
        }
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/snapshots', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    scope: scope.trim() || undefined,
                }),
            });
            toast('Snapshot created', 'success');
            refetch();
            closeModal();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao criar snapshot', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRestore(snap: Snapshot) {
        const confirmMessage = `Restore snapshot "${snap.name}"? This will overwrite ${snap.fileCount || 0} files to their previous state.`;
        if (!window.confirm(confirmMessage)) return;
        
        try {
            const res = await apiFetch<any>(`/api/v1/snapshots/${snap.id}/restore`, { method: 'POST' });
            const result = res?.data;
            
            if (result.errors && result.errors.length > 0) {
                toast(`Restored ${result.restored} files with ${result.errors.length} errors`, 'error');
                console.warn('Restore errors:', result.errors);
            } else {
                toast(`Successfully restored ${result.restored} files`, 'success');
            }
        } catch (e: any) {
            toast(e.message ?? 'Restore failed', 'error');
        }
    }

    async function handleDelete(snap: Snapshot) {
        if (!window.confirm(`Delete snapshot "${snap.name}"?`)) return;
        try {
            await apiFetch(`/api/v1/snapshots/${snap.id}`, { method: 'DELETE' });
            toast(`Snapshot "${snap.name}" deleted`, 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Delete failed', 'error');
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
        >
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Camera className="size-5" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Snapshots</h2>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                >
                    <Plus className="size-3.5" />
                    Criar snapshot
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <Camera className="size-10 text-border" />
                    <p className="text-text-dim text-sm">Ainda não há snapshots.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {list.map(snap => (
                        <div key={snap.id} className="bento-card space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-accent truncate">{snap.name}</p>
                                    <p className="text-[10px] font-mono text-text-dim mt-1">
                                        {formatRelative(snap.createdAt)}
                                    </p>
                                </div>
                                <span className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shrink-0',
                                    getScopeColor(snap.scope || 'system')
                                )}>
                                    {snap.scope || 'system'}
                                </span>
                            </div>
                            
                            {/* File Stats */}
                            {(snap.fileCount !== undefined || snap.totalSize !== undefined) && (
                                <div className="flex items-center gap-4 text-xs text-text-dim">
                                    {snap.fileCount !== undefined && (
                                        <span className="flex items-center gap-1">
                                            <Camera className="size-3" />
                                            {snap.fileCount} files
                                        </span>
                                    )}
                                    {snap.totalSize !== undefined && (
                                        <span className="flex items-center gap-1">
                                            <Plus className="size-3" />
                                            {formatFileSize(snap.totalSize)}
                                        </span>
                                    )}
                                </div>
                            )}
                            
                            {snap.description && (
                                <p className="text-xs text-text-dim leading-relaxed line-clamp-3">
                                    {snap.description}
                                </p>
                            )}
                            
                            {/* Workspace Root */}
                            {snap.workspaceRoot && (
                                <div className="text-xs font-mono text-text-dim/80 bg-bg/50 rounded px-2 py-1 truncate" title={snap.workspaceRoot}>
                                    📁 {snap.workspaceRoot}
                                </div>
                            )}
                            
                            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                <button
                                    onClick={() => handleRestore(snap)}
                                    disabled={!snap.fileCount || snap.fileCount === 0}
                                    className={cn(
                                        'flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
                                        snap.fileCount && snap.fileCount > 0
                                            ? 'border-border text-accent hover:border-primary/60'
                                            : 'border-border/30 text-text-dim/50 cursor-not-allowed'
                                    )}
                                >
                                    <RotateCcw className="size-3" />
                                    Restore
                                </button>
                                <button
                                    onClick={() => handleDelete(snap)}
                                    className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-red-400 hover:border-red-500/40 transition-colors"
                                    aria-label="Delete snapshot"
                                >
                                    <Trash2 className="size-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        key="snapshot-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={closeModal}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bento-card w-full max-w-md space-y-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">New Snapshot</h3>
                                <button
                                    onClick={closeModal}
                                    className="rounded-lg p-1 text-text-dim hover:text-accent hover:bg-white/5 transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="label-caps text-text-dim block mb-1">Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="ex.: antes-da-migracao"
                                        className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
                                    />
                                </div>
                                <div>
                                    <label className="label-caps text-text-dim block mb-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Observações opcionais sobre este snapshot"
                                        className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="label-caps text-text-dim block mb-1">Scope</label>
                                    <select
                                        value={scope}
                                        onChange={e => setScope(e.target.value)}
                                        className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
                                    >
                                        <option value="system">System (All Config Files)</option>
                                        <option value="src">Source Código Only</option>
                                        <option value="full">Full Project</option>
                                    </select>
                                    <p className="text-[10px] text-text-dim mt-1">
                                        {scope === 'system' && 'Captures all configuration and setup files'}
                                        {scope === 'src' && 'Only captures source code files'}
                                        {scope === 'full' && 'Captures all project files (larger size)'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={closeModal}
                                    className={cn(
                                        'flex-1 rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-dim hover:text-accent transition-colors',
                                    )}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={submitting}
                                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
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
