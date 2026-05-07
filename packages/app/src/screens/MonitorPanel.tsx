'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Code2, MemoryStick, Shield, Activity, Bot, GitBranch, Bug, TrendingUp, ShieldAlert, CheckCircle2, XCircle, Clock3, Brain, BookOpen } from 'lucide-react';
import { usePolling } from '@/src/lib/usePolling';
import { useEventStream } from '@/src/lib/useEventStream';
import { useToast } from '@/src/components/Toast';
import { Skeleton, SkeletonRow } from '@/src/components/Skeleton';
import { useCallback, useRef } from 'react';
import { apiFetch } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

const ACTION_ICONS = [Code2, MemoryStick, Shield, Activity];
const TOAST_THROTTLE_MS = 3000;

interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    timestamp: string;
}

interface HealthData { status: string; service: string; timestamp: string }
interface MetricsData { uptime: string; memory: string; loadAvg: string; threads: number }
interface HistoryData { items: any[]; total: number; limit: number; offset: number }
interface AgentStats { totalAgents: number; activeAgents: number; totalTasksCompleted: number; totalTasksFailed: number; byState: Record<string, number> }
interface WorkflowStats { total: number; active: number; totalExecutions: number; successfulExecutions: number; failedExecutions: number; successRate: number }
interface RunsData { items: Array<{ status: string }>; total: number; limit: number; offset: number }

interface ProactiveInsightResponse {
    generatedAt: string;
    provider: string;
    inputEvents: number;
    plan: {
        risks: Array<{ title: string; severity: string; evidence: string; recommendedAction: string }>;
        opportunities: Array<{ title: string; impact: string; evidence: string; suggestedAction: string }>;
        taskCandidates: Array<{ title: string; description: string; priority: string; rationale: string; sensitivity: string }>;
        recommendations: Array<{ title: string; rationale: string; action: string }>;
    };
    pendingApprovals: Array<{ requestId: string; taskTitle: string; reason: string; status: string }>;
}

interface MonitorPanelProps {
    onNavigate: (id: any) => void;
}

export function MonitorPanel({ onNavigate }: MonitorPanelProps) {
    const { data: health, error: healthErr } = usePolling<HealthData>('/api/health', 30000);
    const { data: metricsResponse, loading: metricsLoading, error: metricsErr } = usePolling<ApiEnvelope<MetricsData>>('/api/v1/metrics', 30000);
    const { data: historyResponse, loading: histLoading, error: historyErr } = usePolling<ApiEnvelope<HistoryData>>('/api/chat/history?limit=3', 60000);
    const { data: agentStatsResponse, error: agentsErr } = usePolling<ApiEnvelope<AgentStats>>('/api/v1/agents/stats', 20000);
    const { data: workflowStatsResponse, error: workflowsErr } = usePolling<ApiEnvelope<WorkflowStats>>('/api/v1/workflows/stats', 20000);
    const { data: runsResponse, error: runsErr } = usePolling<ApiEnvelope<RunsData>>('/api/v1/orchestrator/runs?limit=20', 20000);
    const [liveRuns, setLiveRuns] = useState<Array<{ status: string }>>([]);
    const { toast } = useToast();
    const lastToastRef = useRef<Record<string, number>>({});

    const throttledToast = useCallback((msg: string, type: 'success' | 'error' | 'info', key: string) => {
        const now = Date.now();
        if (now - (lastToastRef.current[key] || 0) > TOAST_THROTTLE_MS) {
            toast(msg, type);
            lastToastRef.current[key] = now;
        }
    }, [toast]);

    const handleRunSnapshot = useCallback((snap: any) => {
        setLiveRuns(snap.runs ?? []);
    }, []);

    const handleTaskUpdate = useCallback((event: any) => {
        throttledToast(
            `Task ${event.status}: ${event.task?.description?.slice(0, 30)}...`,
            event.status === 'completed' ? 'success' : event.status === 'failed' ? 'error' : 'info',
            `task-${event.id}-${event.status}`
        );
    }, [throttledToast]);

    const handleAgentState = useCallback((event: any) => {
        throttledToast(
            `Agent ${event.agent?.name} is ${event.state}`,
            'info',
            `agent-${event.id}-${event.state}`
        );
    }, [throttledToast]);

    useEventStream<{ runs: Array<{ status: string }> }>(
        'runs.snapshot',
        handleRunSnapshot,
    );

    useEventStream<any>('task:update', handleTaskUpdate);
    useEventStream<any>('agent:state', handleAgentState);

    const metrics = metricsResponse?.data;
    const history = historyResponse?.data;
    const agentStats = agentStatsResponse?.data;
    const workflowStats = workflowStatsResponse?.data;
    const polledRuns = runsResponse?.data?.items ?? [];

    const allRuns = liveRuns.length > 0 ? liveRuns : polledRuns;

    const runningCount = allRuns.filter(r => r.status === 'running').length;
    const pausedCount = allRuns.filter(r => r.status === 'paused').length;

    useEffect(() => {
        if (healthErr) toast('Could not reach health endpoint', 'error');
    }, [healthErr]);

    const isOnline = health?.status === 'ok';
    const actions: any[] = history?.items ?? [];

    const integrationStatus = [
        { label: 'Health', error: healthErr, loading: !health && !healthErr },
        { label: 'Metrics', error: metricsErr, loading: metricsLoading },
        { label: 'History', error: historyErr, loading: histLoading },
        { label: 'Agents', error: agentsErr, loading: !agentStats && !agentsErr },
        { label: 'Workflows', error: workflowsErr, loading: !workflowStats && !workflowsErr },
        { label: 'Runs', error: runsErr, loading: !allRuns.length && !runsErr },
    ];


    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-4xl mx-auto w-full"
        >
            <div className="flex items-center gap-2 mb-4">
                <span
                    className={
                        isOnline
                            ? 'size-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                            : 'size-2 rounded-full bg-border'
                    }
                />
                <span className="label-caps">{isOnline ? 'Live • streaming' : 'Live • disconnected'}</span>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {integrationStatus.map((item) => {
                    const statusLabel = item.error
                        ? 'erro'
                        : item.loading
                            ? 'carregando'
                            : 'ok';
                    const Icon = item.label === 'Health'
                        ? Shield
                        : item.label === 'Metrics'
                            ? TrendingUp
                            : item.label === 'History'
                                ? BookOpen
                                : item.error
                                    ? XCircle
                                    : item.loading
                                        ? Clock3
                                        : CheckCircle2;
                    const tone = item.error
                        ? 'border-red-500/30 bg-red-500/10 text-red-300'
                        : item.loading
                            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
                            : 'border-green-500/30 bg-green-500/10 text-green-300';

                    if (item.label === 'Health' || item.label === 'Metrics' || item.label === 'History') {
                        return (
                            <button
                                key={item.label}
                                type="button"
                                disabled
                                aria-label={`${item.label} ${statusLabel}`}
                                title={`${item.label} ${statusLabel}`}
                                className={cn(
                                    'inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors',
                                    item.error
                                        ? 'border-red-500/30 bg-red-500/10 text-red-500'
                                        : item.loading
                                            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
                                            : 'border-green-500/30 bg-green-500/10 text-green-500',
                                )}
                            >
                                <Icon className={cn('size-5', item.loading && 'animate-spin')} />
                            </button>
                        );
                    }

                    return (
                        <span
                            key={item.label}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-wider',
                                tone,
                            )}
                            title={`${item.label} ${statusLabel}`}
                        >
                            <Icon className="size-4" />
                            {item.label}: {statusLabel}
                        </span>
                    );
                })}
            </div>
            <div className="grid grid-cols-4 gap-4">
                {/* Hero Card */}
                <div className="bento-card col-span-4 md:col-span-2 md:row-span-2 overflow-hidden">
                    <span className="label-caps">Status</span>
                    <h2 className="text-3xl font-bold tracking-tighter mt-2 mb-4">
                        {isOnline ? 'Agent Ativo & Observing' : health ? 'Agent Degraded' : 'Connecting…'}
                    </h2>
                    <div className="mt-auto space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-text-dim font-medium">Saúde do sistema</span>
                                <span className={`text-xs font-bold ${isOnline ? 'text-green-500' : 'text-text-dim'}`}>
                                    {isOnline ? 'OPTIMAL' : 'UNKNOWN'}
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: isOnline ? '100%' : '20%' }}
                                    className={`h-full ${isOnline ? 'bg-primary' : 'bg-border'}`}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-bg/50 p-3 rounded-xl border border-border">
                                <p className="text-[8px] uppercase font-bold text-text-dim tracking-widest mb-1">MEMORY</p>
                                {metricsLoading
                                    ? <Skeleton className="h-6 w-14 mt-1" />
                                    : <p className="text-lg font-bold font-mono">{metrics?.memory ?? '—'}</p>}
                            </div>
                            <div className="bg-bg/50 p-3 rounded-xl border border-border">
                                <p className="text-[8px] uppercase font-bold text-text-dim tracking-widest mb-1">UPTIME</p>
                                {metricsLoading
                                    ? <Skeleton className="h-6 w-10 mt-1" />
                                    : <p className="text-lg font-bold font-mono">{metrics?.uptime ?? '—'}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 p-4">
                        <div className={`size-2 rounded-full ${isOnline
                            ? 'bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                            : 'bg-border'}`}
                        />
                    </div>
                </div>

                {/* Operações de segurança Card */}
                <div className="bento-card col-span-4 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <span className="label-caps">Operações de segurança</span>
                        <ShieldAlert className="size-4 text-red-500" />
                    </div>
                    <p className="text-xs text-text-dim mb-6">Ferramentas avançadas de teste de estresse e benchmark de LLMs.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onNavigate('benchmarks')}
                            className="flex-1 flex items-center justify-center gap-2 bg-card border border-border py-2.5 rounded-xl font-bold text-xs hover:border-primary/60 transition-colors"
                        >
                            <TrendingUp className="size-3.5" />
                            Benchmarks
                        </button>
                        <button
                            onClick={() => onNavigate('redteaming')}
                            className="flex-1 flex items-center justify-center gap-2 bg-card border border-border py-2.5 rounded-xl font-bold text-xs hover:border-red-500/60 transition-colors text-red-500"
                        >
                            <Bug className="size-3.5" />
                            Red Team
                        </button>
                        <button
                            onClick={() => onNavigate('inference')}
                            className="flex-1 flex items-center justify-center gap-2 bg-card border border-border py-2.5 rounded-xl font-bold text-xs hover:border-primary/60 transition-colors"
                        >
                            <Brain className="size-3.5" />
                            Inference
                        </button>
                    </div>
                </div>

                {/* Stat: Threads */}
                <div className="bento-card col-span-2 md:col-span-1">
                    <span className="label-caps">Threads de CPU</span>
                    <div className="mt-auto pt-4">
                        {metricsLoading
                            ? <Skeleton className="h-9 w-16" />
                            : <p className="text-3xl font-bold tracking-tighter">{metrics?.threads ?? '—'}</p>}
                        <p className="text-[10px] text-text-dim mt-1">Disponível</p>
                    </div>
                </div>

                {/* Stat: Load */}
                <div className="bento-card col-span-2 md:col-span-1">
                    <span className="label-caps">Carga média</span>
                    <div className="mt-auto pt-4">
                        {metricsLoading
                            ? <Skeleton className="h-9 w-16" />
                            : <p className="text-3xl font-bold tracking-tighter">{metrics?.loadAvg ?? '—'}</p>}
                        <p className="text-[10px] text-text-dim mt-1">1-min</p>
                    </div>
                </div>

                {/* Stat: Agents */}
                <div className="bento-card col-span-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Agents</span>
                        <Bot className="size-4 text-text-dim" />
                    </div>
                    <div className="mt-auto pt-4 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-3xl font-bold tracking-tighter">{agentStats?.totalAgents ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Total</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tighter text-green-500">{agentStats?.activeAgents ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Ativo</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono">{agentStats?.totalTasksCompleted ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Tarefas concluídas</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono text-red-500">{agentStats?.totalTasksFailed ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Tarefas com falha</p>
                        </div>
                    </div>
                </div>

                {/* Stat: Workflows */}
                <div className="bento-card col-span-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Workflows</span>
                        <GitBranch className="size-4 text-text-dim" />
                    </div>
                    <div className="mt-auto pt-4 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-3xl font-bold tracking-tighter">{workflowStats?.total ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Total</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tighter text-green-500">{workflowStats?.active ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Ativo</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono">{workflowStats?.totalExecutions ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Execuções</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono text-highlight">{workflowStats?.successRate ?? 0}%</p>
                            <p className="text-[10px] text-text-dim mt-1">Taxa de sucesso</p>
                        </div>
                    </div>
                </div>

                {/* Stat: Execuções ao vivo */}
                <div className="bento-card col-span-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Execuções ao vivo</span>
                        <Activity className="size-4 text-text-dim" />
                    </div>
                    <div className="mt-auto pt-4 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-3xl font-bold tracking-tighter text-green-500">{runningCount}</p>
                            <p className="text-[10px] text-text-dim mt-1">Executando</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tighter text-yellow-500">{pausedCount}</p>
                            <p className="text-[10px] text-text-dim mt-1">Pausado</p>
                        </div>
                    </div>
                </div>

                {/* Ações recentes */}
                <div className="bento-card col-span-4 lg:col-span-2">
                    <span className="label-caps">Ações recentes</span>
                    {histLoading ? (
                        <div className="space-y-1 mt-2">
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    ) : actions.length > 0 ? (
                        <div className="space-y-4 mt-2">
                            {actions.map((action: any, i: number) => {
                                const Icon = ACTION_ICONS[i % ACTION_ICONS.length];
                                const label = action.channelId ?? action.message?.slice(0, 40) ?? 'Action';
                                const time = action.createdAt
                                    ? new Date(action.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : '—';
                                return (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-border text-accent group-hover:text-highlight transition-colors">
                                                <Icon className="size-4" />
                                            </div>
                                            <span className="text-sm font-medium text-accent group-hover:text-highlight transition-colors truncate max-w-45">
                                                {label}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-text-dim shrink-0">{time}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-text-dim mt-4">Nenhuma ação recente registrada.</p>
                    )}
                </div>

                {/* Infraestrutura Card */}
                <div
                    className="bento-card col-span-4 lg:col-span-2 bg-no-repeat bg-cover bg-center overflow-hidden min-h-40"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc48?q=80&w=2000&auto=format&fit=crop')" }}
                >
                    <div className="absolute inset-0 bg-bg/60 backdrop-blur-[2px]" />
                    <div className="relative z-10 mt-auto">
                        <span className="label-caps text-white/80!">Infraestrutura</span>
                        <h4 className="text-white font-bold text-lg">Monitor de snapshots</h4>
                        <p className="text-white/60 text-xs mt-1">Todas as regiões operacionais.</p>
                    </div>
                </div>
            </div>

        </motion.div>
    );
}
