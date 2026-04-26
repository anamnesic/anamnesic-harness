'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Activity, Shield, Plus, Download, Trash2, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { Skeleton } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface HistoryData { data?: any[] | { items?: any[]; total?: number; limit?: number; offset?: number }; count?: number }

export function MemoryLedger() {
    const { toast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [channelId, setChannelId] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<Set<string>>(new Set());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalEntries, setTotalEntries] = useState(0);
    
    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChannel, setSelectedChannel] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    
    // Data state
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [channels, setChannels] = useState<string[]>([]);

    // Build API URL with pagination and filters
    const apiUrl = useMemo(() => {
        const params = new URLSearchParams();
        params.set('limit', pageSize.toString());
        params.set('offset', ((currentPage - 1) * pageSize).toString());
        
        if (searchQuery) {
            params.set('search', searchQuery);
        }
        if (selectedChannel !== 'all') {
            params.set('channel', selectedChannel);
        }
        if (dateFilter !== 'all') {
            params.set('dateFilter', dateFilter);
        }
        
        return `/api/chat/history?${params.toString()}`;
    }, [currentPage, pageSize, searchQuery, selectedChannel, dateFilter]);

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await apiFetch<HistoryData>(apiUrl);
            const inner = response?.data;
            const items: any[] = Array.isArray(inner)
                ? inner
                : (inner && Array.isArray((inner as { items?: any[] }).items) ? (inner as { items: any[] }).items : []);
            
            setEntries(items);
            setTotalEntries((inner as any)?.total || 0);
            
            // Extract unique channels
            const uniqueChannels = [...new Set(items.map((entry: any) => entry.channelId).filter(Boolean))];
            setChannels(uniqueChannels);
        } catch (error) {
            toast('Falha ao carregar entradas de memória', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [apiUrl]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedChannel, dateFilter]);

    const totalPages = Math.ceil(totalEntries / pageSize);

    async function handleDelete(id: string) {
        setDeleting(prev => new Set(prev).add(id));
        try {
            await apiFetch('/api/chat/history?id=' + id, { method: 'DELETE' });
            await fetchData();
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
            await fetchData();
        } catch (e: any) {
            toast(e.message ?? 'Save failed', 'error');
        } finally {
            setSaving(false);
        }
    }

    function exportLog() {
        if (entries.length === 0) {
            toast('Nenhuma entrada para exportar', 'info');
            return;
        }

        const dataStr = JSON.stringify(entries, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `memory-ledger-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        toast('Exporting log...', 'success');
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            'rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold transition-colors',
                            showFilters ? 'text-accent border-accent/40' : 'text-text-dim hover:border-accent/40'
                        )}
                    >
                        <Filter className="size-3.5" />
                        Filters
                    </button>
                    <button
                        onClick={exportLog}
                        className="rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-accent/40 transition-colors"
                    >
                        Export Log
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-dim" />
                    <input
                        type="text"
                        placeholder="Buscar entradas de memória..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-bg border border-border rounded-xl text-sm text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                    />
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bento-card p-4 space-y-4"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Channel Filter */}
                            <div>
                                <label className="label-caps text-text-dim mb-2 block">Channel</label>
                                <select
                                    value={selectedChannel}
                                    onChange={(e) => setSelectedChannel(e.target.value)}
                                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-accent focus:outline-none focus:border-primary"
                                >
                                    <option value="all">All Channels</option>
                                    {channels.map(channel => (
                                        <option key={channel} value={channel}>{channel}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Filter */}
                            <div>
                                <label className="label-caps text-text-dim mb-2 block">Date Range</label>
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-accent focus:outline-none focus:border-primary"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                </select>
                            </div>

                            {/* Results Info */}
                            <div>
                                <label className="label-caps text-text-dim mb-2 block">Results</label>
                                <div className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text-dim">
                                    {totalEntries} total entries
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
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
                    <p className="text-text-dim text-sm">Nenhuma entrada de memória encontrada.</p>
                    <p className="text-text-dim text-xs">
                        {searchQuery || selectedChannel !== 'all' || dateFilter !== 'all' 
                            ? 'Try adjusting your filters or search query.' 
                            : 'Toque no botão abaixo para adicionar a primeira entrada.'}
                    </p>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                    <div className="text-sm text-text-dim">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={cn(
                                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                                currentPage === 1 
                                    ? 'text-text-dim opacity-50 cursor-not-allowed' 
                                    : 'text-accent bg-card border border-border hover:border-primary/60'
                            )}
                        >
                            <ChevronLeft className="size-3" />
                            Previous
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={cn(
                                            'w-8 h-8 rounded-lg text-xs font-bold transition-colors',
                                            currentPage === pageNum
                                                ? 'bg-primary text-bg'
                                                : 'text-accent bg-card border border-border hover:border-primary/60'
                                        )}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={cn(
                                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                                currentPage === totalPages 
                                    ? 'text-text-dim opacity-50 cursor-not-allowed' 
                                    : 'text-accent bg-card border border-border hover:border-primary/60'
                            )}
                        >
                            Next
                            <ChevronRight className="size-3" />
                        </button>
                    </div>
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
                                    placeholder="ex.: kairos-main"
                                    value={channelId}
                                    onChange={e => setChannelId(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label-caps !mb-1 block">Message</label>
                                <textarea
                                    rows={3}
                                    className="w-full rounded-xl bg-bg border border-border px-4 py-3 text-sm font-medium text-accent placeholder-text-dim focus:outline-none focus:border-primary resize-none"
                                    placeholder="Descreva a observação…"
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
