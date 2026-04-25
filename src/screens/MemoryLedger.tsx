'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, Shield, Plus, Download, Trash2 } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { Skeleton } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface HistoryData { data: any[]; count: number }

export function MemoryLedger() {
    const { data, loading, refetch } = useApi<HistoryData>('/api/chat/history');
    const { toast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [channelId, setChannelId] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<Set<string>>(new Set());

    const entries = data?.data ?? [];

    async function handleDelete(id: string) {
        setDeleting(prev => new Set(prev).add(id));
        try {
            await apiFetch('/api/chat/history?id=' + id, { method: 'DELETE' });
            refetch();
            toast('Entry deleted', 'success');
        } catch (e: any) {
            toast(e.message ?? 'Delete failed', 'error');
        } finally {
            setDeleting(prev => { const next = new Set(prev); next.delete(id); return next; });
        }
    }

    async function handleSave() {
        if (!channelId.trim()) { toast('Channel ID is required', 'error'); return; }
        setSaving(true);
        try {
            await apiFetch('/api/chat/history', {
                method: 'POST',
                body: JSON.stringify({ channelId, message }),
            });
            toast('Entry saved', 'success');
            setShowModal(false);
            setChannelId('');
            setMessage('');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    }

    const ENTRY_ICONS = [Activity, Shield, Download];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
        >
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Memory Ledger</h2>
                <button
                    onClick={() => toast('Export not yet implemented', 'info')}
                    className="rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-accent/40 transition-colors"
                >
                    Export Log
                </button>
            </div>

            {loading ? (
                <div className="space-y-6">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="pl-8 relative">
                            <div className="absolute left-[11px] top-2 size-5 flex items-center justify-center rounded-full bg-bg ring-4 ring-bg">
                                <Skeleton className="size-2 rounded-full" />
                            </div>
                            <div className="bento-card space-y-2">
                                <Skeleton className="h-2.5 w-20" />
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : entries.length > 0 ? (
                <div className="relative pl-8 space-y-10">
                    <div className="absolute left-[11px] top-0 h-[calc(100%-10px)] w-[1px] bg-border" />
                    {entries.map((entry: any, i: number) => {
                        const Icon = ENTRY_ICONS[i % ENTRY_ICONS.length];
                        const time = entry.createdAt
                            ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '—';
                        return (
                            <div key={i} className="relative">
                                <div className="absolute left-[-26px] top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bg ring-4 ring-bg">
                                    <div className="size-2 rounded-full bg-primary" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-text-dim tracking-widest uppercase">
                                            {entry.channelId ?? 'CHANNEL'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-text-dim">{time}</span>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                disabled={deleting.has(entry.id)}
                                                className={cn(
                                                    'p-1 rounded-lg text-text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors',
                                                    deleting.has(entry.id) && 'opacity-40 cursor-not-allowed',
                                                )}
                                                aria-label="Delete entry"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bento-card">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Icon className="size-4 text-primary" />
                                            <h4 className="font-bold">Entry</h4>
                                        </div>
                                        <p className="text-sm text-accent leading-relaxed">{entry.message || '(empty)'}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 space-y-3">
                    <Activity className="size-10 text-border mx-auto" />
                    <p className="text-text-dim text-sm">No memory entries yet.</p>
                    <p className="text-text-dim text-xs">Tap the button below to add the first entry.</p>
                </div>
            )}

            {/* FAB */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xs px-6">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-highlight py-4 text-sm font-bold text-bg shadow-2xl transition-all hover:bg-accent active:scale-95"
                >
                    <Plus className="size-5" />
                    New Entry
                </button>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bento-card w-full max-w-md space-y-4"
                    >
                        <h3 className="text-lg font-bold">New Memory Entry</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="label-caps !mb-1 block">Channel ID</label>
                                <input
                                    className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                                    placeholder="e.g. kairos-main"
                                    value={channelId}
                                    onChange={e => setChannelId(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label-caps !mb-1 block">Message</label>
                                <textarea
                                    rows={3}
                                    className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent placeholder-text-dim focus:outline-none focus:border-primary resize-none"
                                    placeholder="Describe the observation…"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 border border-border text-accent rounded-xl py-3 font-bold text-xs tracking-widest uppercase hover:bg-card transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={cn(
                                    'flex-1 bg-highlight text-bg rounded-xl py-3 font-bold text-xs tracking-widest uppercase transition-opacity',
                                    saving && 'opacity-50 cursor-not-allowed',
                                )}
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
