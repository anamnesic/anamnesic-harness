'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Code2, MemoryStick, Shield, Activity, Bot, GitBranch, MessageSquare, Bug, TrendingUp, ShieldAlert } from 'lucide-react';
import { usePolling } from '@/src/lib/usePolling';
import { useEventStream } from '@/src/lib/useEventStream';
import { useToast } from '@/src/components/Toast';
import { Skeleton, SkeletonRow } from '@/src/components/Skeleton';

const ACTION_ICONS = [Code2, MemoryStick, Shield, Activity];

interface HealthData { status: string; service: string; timestamp: string }
interface MetricsData { uptime: string; memory: string; loadAvg: string; threads: number }
interface HistoryData { data?: any[] | { items?: any[]; total?: number }; count?: number }
interface AgentStats { totalAgents: number; activeAgents: number; totalTasksCompleted: number; totalTasksFailed: number; byState: Record<string, number> }
interface WorkflowStats { total: number; active: number; totalExecutions: number; successfulExecutions: number; failedExecutions: number; successRate: number }
interface RunsData { data?: Array<{ status: string }> | { items?: Array<{ status: string }>; total?: number }; count?: number }

interface DashboardProps {
    onNavigate: (id: any) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
    const { data: health, error: healthErr } = usePolling<HealthData>('/api/health', 30000);
    const { data: metrics, loading: metricsLoading } = usePolling<MetricsData>('/api/v1/metrics', 30000);
    const { data: history, loading: histLoading } = usePolling<HistoryData>('/api/chat/history?limit=3', 5000);
    const { data: agentStats } = usePolling<AgentStats>('/api/v1/agents/stats', 5000);
    const { data: workflowStats } = usePolling<WorkflowStats>('/api/v1/workflows/stats', 5000);
    const [liveRuns, setLiveRuns] = useState<Array<{ status: string }>>([]);
    const { toast } = useToast();

    useEventStream<{ runs: Array<{ status: string }> }>(
        'runs.snapshot',
        snap => setLiveRuns(snap.runs ?? []),
    );

    useEventStream<any>('task:update', event => {
        toast(`Task ${event.status}: ${event.task?.description?.slice(0, 30)}...`, 
            event.status === 'completed' ? 'success' : event.status === 'failed' ? 'error' : 'info');
    });

    useEventStream<any>('agent:state', event => {
        toast(`Agent ${event.agent?.name} is now ${event.state}`, 'info');
    });

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
                        {isOnline ? 'Agent Active & Observing' : health ? 'Agent Degraded' : 'Connecting…'}
                    </h2>
                    <div className="mt-auto space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-text-dim font-medium">System Health</span>
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
                    <span className="label-caps">Proactive Suggestion</span>
                    <h3 className="text-lg font-bold tracking-tight">Refactor Auth Middleware</h3>
                    <p className="text-xs text-text-dim mt-2 line-clamp-2">
                        Repetitive patterns detected in routing logic. Abstracting into a shared utility could reduce bundle size by ~4KB.
                    </p>
                    <button className="mt-6 bg-highlight text-bg py-2.5 rounded-xl font-bold text-xs hover:bg-accent transition-colors w-full">
                        Apply Optimization
                    </button>
                </div>

                {/* Security Operations Card */}
                <div className="bento-card col-span-4 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <span className="label-caps">Security Operations</span>
                        <ShieldAlert className="size-4 text-red-500" />
                    </div>
                    <p className="text-xs text-text-dim mb-6">Advanced stress-testing and LLM performance benchmarking tools.</p>
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
                    </div>
                </div>

                {/* Stat: Threads */}
                <div className="bento-card col-span-2 md:col-span-1">
                    <span className="label-caps">CPU Threads</span>
                    <div className="mt-auto pt-4">
                        {metricsLoading
                            ? <Skeleton className="h-9 w-16" />
                            : <p className="text-3xl font-bold tracking-tighter">{metrics?.threads ?? '—'}</p>}
                        <p className="text-[10px] text-text-dim mt-1">Available</p>
                    </div>
                </div>

                {/* Stat: Load */}
                <div className="bento-card col-span-2 md:col-span-1">
                    <span className="label-caps">Load Avg</span>
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
                            <p className="text-[10px] text-text-dim mt-1">Active</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono">{agentStats?.totalTasksCompleted ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Tasks Completed</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono text-red-500">{agentStats?.totalTasksFailed ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Tasks Failed</p>
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
                            <p className="text-[10px] text-text-dim mt-1">Active</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono">{workflowStats?.totalExecutions ?? '—'}</p>
                            <p className="text-[10px] text-text-dim mt-1">Executions</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold font-mono text-highlight">{workflowStats?.successRate ?? 0}%</p>
                            <p className="text-[10px] text-text-dim mt-1">Success Rate</p>
                        </div>
                    </div>
                </div>

                {/* Stat: Live Runs */}
                <div className="bento-card col-span-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Live Runs</span>
                        <Activity className="size-4 text-text-dim" />
                    </div>
                    <div className="mt-auto pt-4 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-3xl font-bold tracking-tighter text-green-500">{runningCount}</p>
                            <p className="text-[10px] text-text-dim mt-1">Running</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold tracking-tighter text-yellow-500">{pausedCount}</p>
                            <p className="text-[10px] text-text-dim mt-1">Paused</p>
                        </div>
                    </div>
                </div>

                {/* Recent Actions */}
                <div className="bento-card col-span-4 lg:col-span-2">
                    <span className="label-caps">Recent Actions</span>
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
                        <p className="text-sm text-text-dim mt-4">No recent actions recorded.</p>
                    )}
                </div>

                {/* Infrastructure Card */}
                <div
                    className="bento-card col-span-4 lg:col-span-2 bg-no-repeat bg-cover bg-center overflow-hidden min-h-40"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc48?q=80&w=2000&auto=format&fit=crop')" }}
                >
                    <div className="absolute inset-0 bg-bg/60 backdrop-blur-[2px]" />
                    <div className="relative z-10 mt-auto">
                        <span className="label-caps text-white/80!">Infrastructure</span>
                        <h4 className="text-white font-bold text-lg">Snapshot Monitor</h4>
                        <p className="text-white/60 text-xs mt-1">All regions operational.</p>
                    </div>
                </div>
            </div>

            {/* Floating Chat Button */}
            {onNavigate && (
                <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onNavigate('chat')}
                    className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                    <MessageSquare className="size-6" />
                </motion.button>
            )}
        </motion.div>
    );
}
