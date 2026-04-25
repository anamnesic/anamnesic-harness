'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Download, ScrollText } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useEventStream } from '@/src/lib/useEventStream';
import { useToast } from '@/src/components/Toast';
import { Skeleton, SkeletonCard } from '@/src/components/Skeleton';
import { AuditTrailModal } from '@/src/components/AuditTrailModal';
import { cn } from '@/src/lib/utils';

interface Run {
    id: string;
    status: string;
    planId: string;
    workspaceId: string;
    createdAt: string;
}

interface Plan {
    id: string;
    objective: string;
    status: string;
    complexityScore: number;
    reasoningMode: string;
    createdAt: string;
}

export function ControlCenter() {
    const { data: runs, loading: runsLoading, refetch } = useApi<Run[] | { items?: Run[] }>('/api/v1/orchestrator/runs');
    const { data: plans, loading: plansLoading } = useApi<Plan[] | { items?: Plan[] }>('/api/v1/orchestrator/plans');
    const { toast } = useToast();
    const [auditPipelineId, setAuditPipelineId] = useState<string | null>(null);
    const [liveRuns, setLiveRuns] = useState<Run[] | null>(null);

    useEventStream<{ runs: Run[] }>('runs.snapshot', snap => {
        setLiveRuns(Array.isArray(snap.runs) ? snap.runs : []);
    });

    const fetched: Run[] = Array.isArray(runs)
        ? runs
        : (runs && Array.isArray((runs as { items?: Run[] }).items) ? (runs as { items: Run[] }).items : []);
    const allRuns = liveRuns ?? fetched;
    const allPlans: Plan[] = Array.isArray(plans)
        ? plans
        : (plans && Array.isArray((plans as { items?: Plan[] }).items) ? (plans as { items: Plan[] }).items : []);

    async function executeRun(runId: string) {
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${runId}/execute`, { method: 'POST' });
            toast('Run authorized', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Execute failed', 'error');
        }
    }

    async function pauseRun(runId: string) {
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${runId}/pause`, { method: 'POST' });
            toast('Run paused', 'info');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Pause failed', 'error');
        }
    }

    async function resumeRun(runId: string) {
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${runId}/resume`, { method: 'POST' });
            toast('Run resumed', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Resume failed', 'error');
        }
    }

    const activeRuns = allRuns.filter(r => r.status === 'running' || r.status === 'paused');
    const running = allRuns.filter(r => r.status === 'running');
    const recent = allRuns.slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-5xl mx-auto w-full"
        >
            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {runsLoading ? (
                    [0, 1, 2].map(i => <SkeletonCard key={i} rows={1} />)
                ) : (
                    [
                        { label: 'Total Runs', value: allRuns.length.toString(), status: 'ALL TIME' },
                        { label: 'Running', value: running.length.toString(), status: 'ACTIVE' },
                        { label: 'Violations', value: '0', status: 'TODAY' },
                    ].map((stat, i) => (
                        <div key={i} className="bento-card">
                            <span className="label-caps">{stat.label}</span>
                            <div className="flex items-center justify-between mt-auto pt-4">
                                <span className="text-4xl font-black tracking-tight">{stat.value}</span>
                                <span className={cn(
                                    'text-[9px] font-black tracking-[0.2em] px-2 py-1 rounded bg-border',
                                    i === 0 ? 'text-primary' : 'text-text-dim',
                                )}>{stat.status}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Active run / action request */}
                {runsLoading ? (
                    <SkeletonCard rows={4} />
                ) : activeRuns.length > 0 ? (
                    <div className="bento-card border-2 border-primary/20">
                        <div className="mb-4">
                            <span className="label-caps !text-primary">Active Run</span>
                            <h4 className="text-xl font-bold tracking-tight truncate">{activeRuns[0].id.slice(0, 8)}…</h4>
                            <p className="text-xs text-text-dim mt-2">Plan: {activeRuns[0].planId.slice(0, 16)}…</p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            {activeRuns[0].status === 'running' ? (
                                <button
                                    onClick={() => pauseRun(activeRuns[0].id)}
                                    className="flex-1 border border-border text-accent rounded-xl py-3 font-black text-[10px] tracking-widest uppercase hover:bg-card transition-colors"
                                >
                                    Pause
                                </button>
                            ) : (
                                <button
                                    onClick={() => resumeRun(activeRuns[0].id)}
                                    className="flex-1 border border-border text-primary rounded-xl py-3 font-black text-[10px] tracking-widest uppercase hover:bg-card transition-colors"
                                >
                                    Resume
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bento-card !p-0 overflow-hidden border-2 border-border">
                        <div className="h-48 relative">
                            <img
                                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2000&auto=format&fit=crop"
                                className="w-full h-full object-cover grayscale brightness-75"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
                        </div>
                        <div className="p-6">
                            <span className="label-caps">No Active Runs</span>
                            <p className="text-xs text-text-dim mt-2">No orchestrator runs are currently active.</p>
                        </div>
                    </div>
                )}

                {/* Run History */}
                <div className="bento-card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold">Run History</h3>
                        <Download className="size-4 text-text-dim" />
                    </div>
                    {runsLoading ? (
                        <div className="space-y-3">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                                    <Skeleton className="h-3 w-12 shrink-0" />
                                    <Skeleton className="h-3 flex-1" />
                                    <Skeleton className="h-3 w-16 shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : recent.length > 0 ? (
                        <div className="space-y-3">
                            {recent.map((run, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-bg border border-border rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-text-dim shrink-0">
                                            {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-xs font-bold tracking-tight truncate max-w-[120px]">
                                            {run.id.slice(0, 8)}…
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setAuditPipelineId(run.id)}
                                            aria-label="View audit trail"
                                            title="View audit trail"
                                            className="p-1.5 rounded-md text-text-dim hover:text-primary hover:bg-card transition-colors"
                                        >
                                            <ScrollText className="size-3.5" />
                                        </button>
                                        <span className={cn(
                                            'text-[8px] font-black tracking-widest px-2 py-0.5 rounded shrink-0',
                                            run.status === 'failed' ? 'bg-red-900/20 text-red-500' : 'bg-primary/10 text-primary',
                                        )}>
                                            {run.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-text-dim">No runs recorded yet.</p>
                    )}
                </div>
            </div>

            {/* Plans section */}
            <div className="bento-card mt-4">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Orchestration Plans</h3>
                </div>
                {plansLoading ? (
                    <div className="space-y-3">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                                <Skeleton className="h-3 flex-1" />
                                <Skeleton className="h-3 w-20 shrink-0" />
                                <Skeleton className="h-3 w-8 shrink-0" />
                                <Skeleton className="h-3 w-16 shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : allPlans.length > 0 ? (
                    <div className="space-y-3">
                        {allPlans.map((plan, i) => (
                            <div key={i} className="flex items-center justify-between gap-4 p-3 bg-bg border border-border rounded-xl">
                                <span className="text-xs font-bold tracking-tight truncate flex-1 min-w-0">
                                    {plan.objective}
                                </span>
                                <span className="text-[8px] font-black tracking-widest px-2 py-0.5 rounded bg-border text-text-dim shrink-0">
                                    {plan.reasoningMode.toUpperCase()}
                                </span>
                                <span className="text-[10px] font-mono text-text-dim shrink-0 w-6 text-center">
                                    {plan.complexityScore}
                                </span>
                                <span className={cn(
                                    'text-[8px] font-black tracking-widest px-2 py-0.5 rounded shrink-0',
                                    plan.status === 'failed' ? 'bg-red-900/20 text-red-500' : 'bg-primary/10 text-primary',
                                )}>
                                    {plan.status.toUpperCase()}
                                </span>
                                <span className="text-[10px] font-mono text-text-dim shrink-0">
                                    {new Date(plan.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-text-dim">No plans yet.</p>
                )}
            </div>

            {auditPipelineId && (
                <AuditTrailModal
                    pipelineId={auditPipelineId}
                    onClose={() => setAuditPipelineId(null)}
                />
            )}
        </motion.div>
    );
}
