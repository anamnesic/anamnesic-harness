'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { Skeleton } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface ContextEntry {
    id: string;
    key: string;
    value: string;
    category: string;
    priority: number;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
}

type Category = 'all' | 'architecture' | 'requirements' | 'dependencies' | 'standards' | 'general';

const CATEGORIES: { value: Category; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'architecture', label: 'Architecture' },
    { value: 'requirements', label: 'Requirements' },
    { value: 'dependencies', label: 'Dependencies' },
    { value: 'standards', label: 'Standards' },
    { value: 'general', label: 'General' },
];

const CATEGORY_COLORS: Record<string, string> = {
    architecture: 'bg-blue-500/15 text-blue-400',
    requirements: 'bg-green-500/15 text-green-400',
    dependencies: 'bg-orange-500/15 text-orange-400',
    standards: 'bg-purple-500/15 text-purple-400',
    general: 'bg-zinc-500/15 text-zinc-400',
};

function PriorityDots({ priority }: { priority: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4].map(i => (
                <span
                    key={i}
                    className={cn(
                        'size-1.5 rounded-full',
                        i <= priority ? 'bg-accent' : 'bg-border'
                    )}
                />
            ))}
        </div>
    );
}

interface EntryModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: { key: string; value: string; category: string; priority: number }) => Promise<void>;
    initial?: Partial<ContextEntry>;
    saving: boolean;
}

function EntryModal({ open, onClose, onSave, initial, saving }: EntryModalProps) {
    const [key, setKey] = useState(initial?.key ?? '');
    const [value, setValue] = useState(initial?.value ?? '');
    const [category, setCategory] = useState(initial?.category ?? 'general');
    const [priority, setPriority] = useState(initial?.priority ?? 2);

    useEffect(() => {
        if (open) {
            setKey(initial?.key ?? '');
            setValue(initial?.value ?? '');
            setCategory(initial?.category ?? 'general');
            setPriority(initial?.priority ?? 2);
        }
    }, [open, initial?.key, initial?.value, initial?.category, initial?.priority]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="context-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        key="context-modal"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        className="bento-card w-full max-w-md space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">{initial?.id ? 'Edit Entry' : 'Add Entry'}</h3>
                            <button onClick={onClose} className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="label-caps block mb-1">Key</label>
                                <input
                                    className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-mono text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                                    placeholder="e.g. TECH_STACK"
                                    value={key}
                                    onChange={e => setKey(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label-caps block mb-1">Value</label>
                                <textarea
                                    rows={4}
                                    className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm text-accent placeholder-text-dim focus:outline-none focus:border-primary resize-none"
                                    placeholder="Context value…"
                                    value={value}
                                    onChange={e => setValue(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="label-caps block mb-1">Category</label>
                                    <select
                                        className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent focus:outline-none focus:border-primary"
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                    >
                                        <option value="architecture">Architecture</option>
                                        <option value="requirements">Requirements</option>
                                        <option value="dependencies">Dependencies</option>
                                        <option value="standards">Standards</option>
                                        <option value="general">General</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="label-caps block mb-1">Priority</label>
                                    <select
                                        className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent focus:outline-none focus:border-primary"
                                        value={priority}
                                        onChange={e => setPriority(Number(e.target.value))}
                                    >
                                        <option value={1}>1 - Low</option>
                                        <option value={2}>2 - Normal</option>
                                        <option value={3}>3 - High</option>
                                        <option value={4}>4 - Critical</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-text-dim hover:text-accent transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onSave({ key: key.trim(), value: value.trim(), category, priority })}
                                disabled={saving}
                                className="flex-1 rounded-xl bg-highlight py-3 text-sm font-bold text-bg hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function ProjectContext({ projectId }: { projectId: string }) {
    const [activeCategory, setActiveCategory] = useState<Category>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ContextEntry | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery]);

    const apiPath = debouncedSearch
        ? `/api/v1/projects/${projectId}/context?q=${encodeURIComponent(debouncedSearch)}`
        : activeCategory === 'all'
            ? `/api/v1/projects/${projectId}/context`
            : `/api/v1/projects/${projectId}/context?category=${activeCategory}`;

    const { data, loading, refetch } = useApi<ContextEntry[]>(apiPath);
    const entries = data ?? [];

    function openAdd() {
        setEditing(null);
        setModalOpen(true);
    }

    function openEdit(entry: ContextEntry) {
        setEditing(entry);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditing(null);
    }

    async function handleSave(input: { key: string; value: string; category: string; priority: number }) {
        if (!input.key) { toast('Key is required', 'error'); return; }
        if (!input.value) { toast('Value is required', 'error'); return; }
        setSaving(true);
        try {
            if (editing) {
                await apiFetch(`/api/v1/projects/${projectId}/context/${editing.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(input),
                });
                toast('Entry updated', 'success');
            } else {
                await apiFetch(`/api/v1/projects/${projectId}/context`, {
                    method: 'POST',
                    body: JSON.stringify({ projectId, ...input }),
                });
                toast('Entry created', 'success');
            }
            refetch();
            closeModal();
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : 'Failed to save entry', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        setDeleting(id);
        try {
            await apiFetch(`/api/v1/projects/${projectId}/context/${id}`, { method: 'DELETE' });
            toast('Entry deleted', 'success');
            refetch();
        } catch (e: unknown) {
            toast(e instanceof Error ? e.message : 'Failed to delete entry', 'error');
        } finally {
            setDeleting(null);
        }
    }

    return (
        <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold tracking-tight">Context</h3>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-1.5 rounded-xl bg-card border border-border px-3 py-1.5 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                >
                    <Plus className="size-3" />
                    Add Entry
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-dim pointer-events-none" />
                <input
                    className="w-full rounded-xl bg-bg border border-border pl-9 pr-4 py-2.5 text-sm text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                    placeholder="Search context…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => { setActiveCategory(cat.value); setSearchQuery(''); }}
                        className={cn(
                            'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors',
                            activeCategory === cat.value
                                ? 'bg-accent text-bg'
                                : 'bg-card border border-border text-text-dim hover:text-accent'
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="bento-card space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-3/4" />
                        </div>
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <p className="text-sm text-text-dim py-8 text-center">No context entries</p>
            ) : (
                <div className="space-y-3">
                    {entries.map(entry => (
                        <motion.div
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bento-card space-y-2"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span className="font-bold font-mono text-sm text-accent">{entry.key}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.general)}>
                                        {entry.category}
                                    </span>
                                    <PriorityDots priority={entry.priority} />
                                    <button
                                        onClick={() => openEdit(entry)}
                                        className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors"
                                        aria-label="Edit entry"
                                    >
                                        <Pencil className="size-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(entry.id)}
                                        disabled={deleting === entry.id}
                                        className="rounded-lg p-1.5 text-text-dim hover:text-red-400 transition-colors disabled:opacity-40"
                                        aria-label="Delete entry"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-text-dim leading-relaxed line-clamp-2">{entry.value}</p>
                        </motion.div>
                    ))}
                </div>
            )}

            <EntryModal
                open={modalOpen}
                onClose={closeModal}
                onSave={handleSave}
                initial={editing ?? undefined}
                saving={saving}
            />
        </div>
    );
}
