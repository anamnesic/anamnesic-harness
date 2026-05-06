'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ChevronDown, ChevronRight, ScrollText } from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { Skeleton } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface ActionLogEntry {
    id: string;
    timestamp: string;
    pipelineId: string;
    phaseIndex: number;
    taskId: string;
    agentRole: string;
    toolName: string;
    input: unknown;
    output: unknown;
    result: 'success' | 'error' | 'blocked' | 'partial' | string;
    durationMs: number;
    dryRun: boolean;
    filesAffected?: string[];
    commandDetails?: unknown;
}

function resultClasses(result: string): string {
    switch (result) {
        case 'success':
            return 'bg-green-900/20 text-green-500';
        case 'error':
        case 'blocked':
            return 'bg-red-900/20 text-red-500';
        case 'partial':
            return 'bg-yellow-900/20 text-yellow-500';
        default:
            return 'bg-border text-text-dim';
    }
}

function unwrap<T>(payload: unknown): T | null {
    if (payload && typeof payload === 'object' && 'data' in (payload as any)) {
        return (payload as any).data as T;
    }
    return (payload as T) ?? null;
}

export function AuditTrailModal({
    pipelineId,
    onClose,
}: {
    pipelineId: string;
    onClose: () => void;
}) {
    const [entries, setEntries] = useState<ActionLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [phaseFilter, setPhaseFilter] = useState<string>('all');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        apiFetch<unknown>(`/api/v1/action-logs/${pipelineId}`)
            .then(payload => {
                if (cancelled) return;
                const data = unwrap<ActionLogEntry[]>(payload);
                setEntries(Array.isArray(data) ? data : []);
            })
            .catch(e => {
                if (cancelled) return;
                setError(e?.message ?? 'Failed to load action logs');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [pipelineId]);

    const phases = useMemo(() => {
        const set = new Set<number>();
        for (const e of entries) set.add(e.phaseIndex);
        return Array.from(set).sort((a, b) => a - b);
    }, [entries]);

    const visible = useMemo(() => {
        if (phaseFilter === 'all') return entries;
        const idx = Number(phaseFilter);
        return entries.filter(e => e.phaseIndex === idx);
    }, [entries, phaseFilter]);

    function toggle(id: string) {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    }

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    key="card"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 12 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                    onClick={e => e.stopPropagation()}
                    className="bento-card w-full max-w-4xl max-h-[85vh] flex flex-col p-0! overflow-hidden border-2 border-border"
                >
                    <div className="flex items-center justify-between p-5 border-b border-border">
                        <div className="flex items-center gap-3 min-w-0">
                            <ScrollText className="size-4 text-primary shrink-0" />
                            <div className="min-w-0">
                                <span className="label-caps">Audit Trail</span>
                                <h3 className="text-base font-bold tracking-tight font-mono truncate">
                                    {pipelineId}
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {phases.length > 0 && (
                                <select
                                    value={phaseFilter}
                                    onChange={e => setPhaseFilter(e.target.value)}
                                    className="bg-bg border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-primary"
                                >
                                    <option value="all">All phases</option>
                                    {phases.map(p => (
                                        <option key={p} value={String(p)}>
                                            Phase {p}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-2 rounded-lg hover:bg-card text-text-dim hover:text-text transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-2">
                        {loading ? (
                            <div className="space-y-2">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                                        <Skeleton className="h-3 w-16 shrink-0" />
                                        <Skeleton className="h-3 w-20 shrink-0" />
                                        <Skeleton className="h-3 flex-1" />
                                        <Skeleton className="h-3 w-12 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <p className="text-sm text-red-500">{error}</p>
                        ) : visible.length === 0 ? (
                            <p className="text-sm text-text-dim text-center py-12">
                                No action logs for this pipeline
                            </p>
                        ) : (
                            visible.map(entry => {
                                const isOpen = !!expanded[entry.id];
                                return (
                                    <div
                                        key={entry.id}
                                        className="border border-border rounded-xl bg-bg overflow-hidden"
                                    >
                                        <button
                                            onClick={() => toggle(entry.id)}
                                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-card transition-colors"
                                        >
                                            {isOpen ? (
                                                <ChevronDown className="size-3 text-text-dim shrink-0" />
                                            ) : (
                                                <ChevronRight className="size-3 text-text-dim shrink-0" />
                                            )}
                                            <span className="text-[10px] font-mono text-text-dim shrink-0 w-20">
                                                {new Date(entry.timestamp).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                })}
                                            </span>
                                            <span className="text-[8px] font-black tracking-widest px-2 py-0.5 rounded bg-border text-text-dim shrink-0 uppercase">
                                                {entry.agentRole}
                                            </span>
                                            <span className="text-xs font-mono truncate flex-1 min-w-0">
                                                {entry.toolName}
                                            </span>
                                            <span className="text-[10px] font-mono text-text-dim shrink-0">
                                                P{entry.phaseIndex}
                                            </span>
                                            <span className="text-[10px] font-mono text-text-dim shrink-0">
                                                {entry.durationMs}ms
                                            </span>
                                            {entry.dryRun && (
                                                <span className="text-[8px] font-black tracking-widest px-2 py-0.5 rounded bg-accent/10 text-accent shrink-0">
                                                    DRY
                                                </span>
                                            )}
                                            <span
                                                className={cn(
                                                    'text-[8px] font-black tracking-widest px-2 py-0.5 rounded shrink-0 uppercase',
                                                    resultClasses(entry.result),
                                                )}
                                            >
                                                {entry.result}
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
                                                <div>
                                                    <span className="label-caps">Input</span>
                                                    <pre className="mt-1 text-[11px] font-mono bg-card border border-border rounded-lg p-3  whitespace-pre-wrap wrap-break-word">
                                                        {JSON.stringify(entry.input, null, 2)}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <span className="label-caps">Output</span>
                                                    <pre className="mt-1 text-[11px] font-mono bg-card border border-border rounded-lg p-3  whitespace-pre-wrap wrap-break-word">
                                                        {JSON.stringify(entry.output, null, 2)}
                                                    </pre>
                                                </div>
                                                {entry.filesAffected && entry.filesAffected.length > 0 && (
                                                    <div>
                                                        <span className="label-caps">Files Affected</span>
                                                        <ul className="mt-1 text-[11px] font-mono text-text-dim space-y-0.5">
                                                            {entry.filesAffected.map((f, i) => (
                                                                <li key={i}>{f}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {entry.commandDetails !== undefined && entry.commandDetails !== null && (
                                                    <div>
                                                        <span className="label-caps">Command Details</span>
                                                        <pre className="mt-1 text-[11px] font-mono bg-card border border-border rounded-lg p-3 whitespace-pre-wrap break-words">
                                                            {JSON.stringify(entry.commandDetails, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

