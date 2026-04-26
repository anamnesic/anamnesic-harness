'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Code2, MemoryStick, Shield, Activity, Bot, GitBranch, Bug, TrendingUp, ShieldAlert, CheckCircle2, XCircle, Clock3, RefreshCcw, Brain } from 'lucide-react';
import { usePolling } from '@/src/lib/usePolling';
import { useEventStream } from '@/src/lib/useEventStream';
import { useToast } from '@/src/components/Toast';
import { Skeleton, SkeletonRow } from '@/src/components/Skeleton';
import { useCallback, useRef } from 'react';
import { apiFetch } from '@/src/lib/api';

const ACTION_ICONS = [Code2, MemoryStick, Shield, Activity];
const TOAST_THROTTLE_MS = 3000;

interface HealthData { status: string; service: string; timestamp: string }
interface MetricsData { uptime: string; memory: string; loadAvg: string; threads: number }
interface HistoryData { data?: any[] | { items?: any[]; total?: number }; count?: number }
interface AgentStats { totalAgents: number; activeAgents: number; totalTasksCompleted: number; totalTasksFailed: number; byState: Record<string, number> }
interface WorkflowStats { total: number; active: number; totalExecutions: number; successfulExecutions: number; failedExecutions: number; successRate: number }
interface RunsData { data?: Array<{ status: string }> | { items?: Array<{ status: string }>; total?: number }; count?: number }

interface ProactiveInsightResponse {
    success?: boolean;
    data?: {
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
    };
}

interface DashboardProps {
    onNavigate: (id: any) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
    const { data: health, error: healthErr } = usePolling<HealthData>('/api/health', 30000);
    const { data: metrics, loading: metricsLoading } = usePolling<MetricsData>('/api/v1/metrics', 30000);
    const { data: history, loading: histLoading } = usePolling<HistoryData>('/api/chat/history?limit=3', 60000);
    const { data: agentStats } = usePolling<AgentStats>('/api/v1/agents/stats', 20000);
    const { data: workflowStats } = usePolling<WorkflowStats>('/api/v1/workflows/stats', 20000);
    const { data: proactiveInsights, loading: proactiveLoading, refetch: refetchProactive } = usePolling<ProactiveInsightResponse>('/api/v1/proactive/insights', 45000);
    const [liveRuns, setLiveRuns] = useState<Array<{ status: string }>>([]);
    const [proactiveBusy, setProactiveBusy] = useState(false);
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

    const runningCount = liveRuns.filter(r => r.status === 'running').length;
    const pausedCount = liveRuns.filter(r => r.status === 'paused').length;

    useEffect(() => {
        if (healthErr) toast('Could not reach health endpoint', 'error');
    }, [healthErr]);

    const isOnline = health?.status === 'ok';
    const histInner = history?.data;
    const actions: any[] = Array.isArray(histInner)
        ? histInner
        : (histInner && Array.isArray((histInner as { items?: any[] }).items) ? (histInner as { items: any[] }).items : []);

    const proactiveData = proactiveInsights?.data;
    const topRecommendation = proactiveData?.plan?.recommendations?.[0];
    const topRisk = proactiveData?.plan?.risks?.[0];
    const topPendingApproval = proactiveData?.pendingApprovals?.find((item) => item.status === 'pending') || null;

    async function runProactiveAction(action: 'refresh' | 'approve' | 'reject' | 'postpone', requestId?: string) {
        setProactiveBusy(true);
        try {
            await apiFetch('/api/v1/proactive/insights', {
                method: 'POST',
                body: JSON.stringify({ action, requestId }),
            });

            if (action === 'refresh') {
                toast('Insights proativos atualizados', 'success');
            }
            if (action === 'approve') {
                toast('Ação aprovada', 'success');
            }
            if (action === 'reject') {
                toast('Ação rejeitada', 'info');
            }
            if (action === 'postpone') {
                toast('Ação adiada', 'info');
            }

            await refetchProactive();
        } catch (error) {
            toast('Falha ao processar ação proativa', 'error');
        } finally {
            setProactiveBusy(false);
        }
    }

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

                {/* Suggestion Card */}
                <div className="bento-card col-span-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Sugestão proativa</span>
                        <button
                            onClick={() => void runProactiveAction('refresh')}
                            disabled={proactiveBusy}
                            className="rounded-lg border border-border p-1.5 hover:border-primary/60 transition-colors disabled:opacity-60"
                            aria-label="Atualizar insights proativos"
                        >
                            <RefreshCcw className="size-3.5" />
                        </button>
                    </div>

                    {proactiveLoading ? (
                        <div className="space-y-2 mt-4">
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold tracking-tight mt-2">
                                {topRecommendation?.title || topRisk?.title || 'Sem sugestão prioritária no momento'}
                            </h3>
                            <p className="text-xs text-text-dim mt-2 line-clamp-3">
                                {topRecommendation?.rationale || topRisk?.evidence || 'Nenhum insight relevante gerado ainda.'}
                            </p>
                            <p className="text-[10px] text-text-dim mt-3">
                                {proactiveData
                                    ? `Provider: ${proactiveData.provider} · Eventos: ${proactiveData.inputEvents}`
                                    : 'Aguardando primeira execução do planner'}
                            </p>
                        </>
                    )}

                    {topPendingApproval && (
                        <div className="mt-4 rounded-xl border border-border p-3 bg-bg/40">
                            <p className="text-[10px] uppercase tracking-widest text-text-dim font-bold">Aprovação pendente</p>
                            <p className="text-sm font-semibold mt-1">{topPendingApproval.taskTitle}</p>
                            <p className="text-xs text-text-dim mt-1 line-clamp-2">{topPendingApproval.reason}</p>
                            <div className="grid grid-cols-3 gap-2 mt-3">
                                <button
                                    onClick={() => void runProactiveAction('approve', topPendingApproval.requestId)}
                                    disabled={proactiveBusy}
                                    className="flex items-center justify-center gap-1 rounded-lg bg-green-500/15 text-green-400 py-2 text-[11px] font-bold hover:bg-green-500/20 transition-colors disabled:opacity-60"
                                >
                                    <CheckCircle2 className="size-3.5" />
                                    Aprovar
                                </button>
                                <button
                                    onClick={() => void runProactiveAction('reject', topPendingApproval.requestId)}
                                    disabled={proactiveBusy}
                                    className="flex items-center justify-center gap-1 rounded-lg bg-red-500/15 text-red-400 py-2 text-[11px] font-bold hover:bg-red-500/20 transition-colors disabled:opacity-60"
                                >
                                    <XCircle className="size-3.5" />
                                    Rejeitar
                                </button>
                                <button
                                    onClick={() => void runProactiveAction('postpone', topPendingApproval.requestId)}
                                    disabled={proactiveBusy}
                                    className="flex items-center justify-center gap-1 rounded-lg bg-yellow-500/15 text-yellow-400 py-2 text-[11px] font-bold hover:bg-yellow-500/20 transition-colors disabled:opacity-60"
                                >
                                    <Clock3 className="size-3.5" />
                                    Adiar
                                </button>
                            </div>
                        </div>
                    )}
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
                            <p className="text-lg font-bold font-mono">{workflowStats?.totalExecuçãos ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Execuçãos</p>
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
