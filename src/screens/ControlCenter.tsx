'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, ScrollText, Undo2, X, Plus, Target, Clock, Shield, AlertTriangle, CheckCircle, Play, RotateCcw } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { usePolling } from '@/src/lib/usePolling';
import { useEventStream } from '@/src/lib/useEventStream';
import { useToast } from '@/src/components/Toast';
import { Skeleton, SkeletonCard } from '@/src/components/Skeleton';
import { AuditTrailModal } from '@/src/components/AuditTrailModal';
import { cn } from '@/src/lib/utils';
import { Paginator } from '@/src/components/Paginator';

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
    const [offsetRuns, setOffsetRuns] = useState(0);
    const limitRuns = 10;
    const [offsetPlanos, setOffsetPlanos] = useState(0);
    const limitPlanos = 10;

    const { data: runs, loading: runsLoading, refetch } = usePolling<any>(`/api/v1/orchestrator/runs?limit=${limitRuns}&offset=${offsetRuns}`, 15000);
    const { data: plans, loading: plansLoading } = useApi<any>(`/api/v1/orchestrator/plans?limit=${limitPlanos}&offset=${offsetPlanos}`);
    
    const { toast } = useToast();
    const [auditPipelineId, setAuditPipelineId] = useState<string | null>(null);
    const [liveRuns, setLiveRuns] = useState<Run[] | null>(null);
    const [rollbackRunId, setRollbackRunId] = useState<string | null>(null);
    const [rollbackStep, setRollbackStep] = useState<string>('0');
    const [rollbackSubmitting, setRollbackSubmitting] = useState(false);
    
    // Plan creation state
    const [showPlanForm, setShowPlanForm] = useState(false);
    const [planForm, setPlanForm] = useState({
        objective: '',
        constraints: [] as string[],
        priority: 'normal' as 'low' | 'normal' | 'high' | 'critical',
        deadlineMinutes: 0,
        reasoningMode: 'standard' as 'standard' | 'extended',
        allowCódigoExecução: false,
        requireApproval: true,
    });
    const [isCreatingPlan, setIsCreatingPlan] = useState(false);
    
    // Approval modal state
    const [approvalRunId, setApprovalRunId] = useState<string | null>(null);
    const [approvalContext, setApprovalContext] = useState<any>(null);
    const [isApproving, setIsApproving] = useState(false);
    
    // Plan detail modal state
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [planRuns, setPlanRuns] = useState<Run[]>([]);
    const [planCheckpoints, setPlanCheckpoints] = useState<any[]>([]);
    const [loadingPlanDetails, setLoadingPlanDetails] = useState(false);
    
    // Tasks drill-down state
    const [selectedRunForTasks, setSelectedRunForTasks] = useState<string | null>(null);
    const [runTasks, setRunTasks] = useState<any[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // Logs drill-down state
    const [selectedTaskForLogs, setSelectedTaskForLogs] = useState<string | null>(null);
    const [taskLogs, setTaskLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEventStream<{ runs: Run[] }>('runs.snapshot', snap => {
        setLiveRuns(Array.isArray(snap.runs) ? snap.runs : []);
    });

    const fetched: Run[] = Array.isArray(runs)
        ? runs
        : (runs && Array.isArray((runs as { items?: Run[] }).items) ? (runs as { items: Run[] }).items : []);
    const allRuns = liveRuns ?? fetched;
    const allPlanos: Plan[] = Array.isArray(plans)
        ? plans
        : (plans && Array.isArray((plans as { items?: Plan[] }).items) ? (plans as { items: Plan[] }).items : []);

    async function executeRun(runId: string) {
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${runId}/execute`, { method: 'POST' });
            toast('Execução autorizada', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao executar', 'error');
        }
    }

    async function pauseRun(runId: string) {
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${runId}/pause`, { method: 'POST' });
            toast('Execução pausada', 'info');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao pausar', 'error');
        }
    }

    async function resumeRun(runId: string) {
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${runId}/resume`, { method: 'POST' });
            toast('Execução retomada', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao retomar', 'error');
        }
    }

    function handleRollbackRun(runId: string, snapshotId: string) {
        setRollbackRunId(runId);
        setRollbackStep('0');
    }

    async function createPlan() {
        if (!planForm.objective.trim()) {
            toast('Objetivo é obrigatório', 'error');
            return;
        }
        
        setIsCreatingPlan(true);
        try {
            const response = await apiFetch('/api/v1/orchestrator/plans', {
                method: 'POST',
                body: JSON.stringify({
                    objective: planForm.objective.trim(),
                    constraints: planForm.constraints.filter(c => c.trim()),
                    priority: planForm.priority,
                    deadlineMinutes: planForm.deadlineMinutes || undefined,
                    policy: {
                        allowCódigoExecução: planForm.allowCódigoExecução,
                        requireHumanApprovalForSensitiveOps: planForm.requireApproval,
                    },
                }),
            });
            
            toast('Plano criado com sucesso', 'success');
            setShowPlanForm(false);
            setPlanForm({
                objective: '',
                constraints: [],
                priority: 'normal',
                deadlineMinutes: 0,
                reasoningMode: 'standard',
                allowCódigoExecução: false,
                requireApproval: true,
            });
            refetch();
        } catch (e: any) {
            toast(e.message || 'Falha ao criar plano', 'error');
        } finally {
            setIsCreatingPlan(false);
        }
    }

    async function showApprovalModal(runId: string) {
        try {
            // Get policy audits for this run to understand what needs approval
            const auditsResponse = await apiFetch<{ audits: any[] }>(`/api/v1/orchestrator/policy-audits?planId=${allRuns.find(r => r.id === runId)?.planId}`);
            const runDetails = await apiFetch<any>(`/api/v1/orchestrator/runs/${runId}`);
            
            setApprovalContext({
                run: runDetails,
                audits: auditsResponse.audits,
                plan: allPlanos.find(p => p.id === runDetails.planId)
            });
            setApprovalRunId(runId);
        } catch (e: any) {
            toast('Falha ao carregar contexto de aprovação', 'error');
        }
    }

    async function approveAndExecute() {
        if (!approvalRunId) return;
        
        setIsApproving(true);
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${approvalRunId}/execute`, { method: 'POST' });
            toast('Execução aprovada e iniciada', 'success');
            setApprovalRunId(null);
            setApprovalContext(null);
            refetch();
        } catch (e: any) {
            toast(e.message || 'Falha ao aprovar execução', 'error');
        } finally {
            setIsApproving(false);
        }
    }

    async function showPlanDetails(plan: Plan) {
        setSelectedPlan(plan);
        setLoadingPlanDetails(true);
        
        try {
            // Load runs for this plan
            const runsResponse = await apiFetch<{ items?: Run[] }>(`/api/v1/orchestrator/runs?planId=${plan.id}`);
            const planRuns = Array.isArray(runsResponse) 
                ? runsResponse 
                : (runsResponse as any).items || [];
            setPlanRuns(planRuns);
            
            // Load checkpoints for the latest run (if any)
            if (planRuns.length > 0) {
                const latestRun = planRuns[0];
                const checkpointsResponse = await apiFetch<{ checkpoints: any[] }>(`/api/v1/orchestrator/plans/${plan.id}/checkpoints`);
                setPlanCheckpoints(checkpointsResponse.checkpoints || []);
            } else {
                setPlanCheckpoints([]);
            }
        } catch (e: any) {
            toast('Falha ao carregar detalhes do plano', 'error');
            setPlanRuns([]);
            setPlanCheckpoints([]);
        } finally {
            setLoadingPlanDetails(false);
        }
    }

    async function submitRollback() {
        if (!rollbackRunId) return;
        const step = Number(rollbackStep);
        if (!Number.isInteger(step) || step < 0) {
            toast('Etapa deve ser um número inteiro não negativo', 'error');
            return;
        }
        setRollbackSubmitting(true);
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${rollbackRunId}/rollback`, {
                method: 'POST',
                body: JSON.stringify({ toStep: step }),
            });
            toast(`Rolled back to step ${step}`, 'success');
            setRollbackRunId(null);
            setRollbackStep('0');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha no rollback', 'error');
        } finally {
            setRollbackSubmitting(false);
        }
    }

    async function fetchRunTasks(runId: string) {
        if (selectedRunForTasks === runId) {
            setSelectedRunForTasks(null);
            setRunTasks([]);
            return;
        }
        
        setSelectedRunForTasks(runId);
        setLoadingTasks(true);
        try {
            const response = await apiFetch<{ data?: any[] }>(`/api/v1/orchestrator/runs/${runId}/tasks`);
            setRunTasks(Array.isArray(response) ? response : (response.data || []));
        } catch (e: any) {
            toast('Falha ao carregar tarefas da execução', 'error');
            setRunTasks([]);
        } finally {
            setLoadingTasks(false);
        }
    }

    async function fetchTaskLogs(taskId: string) {
        if (selectedTaskForLogs === taskId) {
            setSelectedTaskForLogs(null);
            setTaskLogs([]);
            return;
        }

        setSelectedTaskForLogs(taskId);
        setLoadingLogs(true);
        try {
            const response = await apiFetch<{ data?: any[] }>(`/api/v1/tasks/${taskId}/logs`);
            setTaskLogs(Array.isArray(response) ? response : (response.data || []));
        } catch (e: any) {
            toast('Falha ao carregar logs da tarefa', 'error');
            setTaskLogs([]);
        } finally {
            setLoadingLogs(false);
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
                        { label: 'Executando', value: running.length.toString(), status: 'ACTIVE' },
                        { label: 'Violations', value: '0', status: 'TODAY' },
                    ].map((stat, index) => (
                        <div key={`stat-${stat.label}`} className="bento-card">
                            <span className="label-caps">{stat.label}</span>
                            <div className="flex items-center justify-between mt-auto pt-4">
                                <span className="text-4xl font-black tracking-tight">{stat.value}</span>
                                <span className={cn(
                                    'text-[9px] font-black tracking-[0.2em] px-2 py-1 rounded bg-border',
                                    index === 0 ? 'text-primary' : 'text-text-dim',
                                )}>{stat.status}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Planos Section */}
                <div className="bento-card">
                    <div className="flex items-center justify-between mb-4">
                        <span className="label-caps">Planos</span>
                        <button
                            onClick={() => setShowPlanForm(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            <Plus className="size-4" />
                            Criar plano
                        </button>
                    </div>
                    
                    {plansLoading ? (
                        <SkeletonCard rows={3} />
                    ) : allPlanos.length > 0 ? (
                        <div className="space-y-2">
                            {allPlanos.slice(0, 3).map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => showPlanDetails(plan)}
                                    className="w-full p-3 bg-bg border border-border rounded-lg text-left hover:border-accent transition-colors group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-sm text-highlight truncate group-hover:text-accent transition-colors">
                                                {plan.objective}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-text-dim">
                                                    {new Date(plan.createdAt).toLocaleDateString()}
                                                </span>
                                                <span className={cn(
                                                    'text-xs px-2 py-0.5 rounded-full',
                                                    plan.complexityScore > 70 ? 'bg-red-500/20 text-red-400' :
                                                    plan.complexityScore > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-green-500/20 text-green-400'
                                                )}>
                                                    {plan.complexityScore}% complex
                                                </span>
                                                <span className="text-xs text-text-dim">
                                                    {plan.reasoningMode}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-text-dim group-hover:text-accent transition-colors">
                                            <ScrollText className="size-4" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {allPlanos.length > 3 && (
                                <div className="text-xs text-text-dim text-center py-2">
                                    +{allPlanos.length - 3} more plans
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Target className="size-8 text-text-dim mx-auto mb-2" />
                            <p className="text-sm text-text-dim">Ainda não há planos</p>
                            <p className="text-xs text-text-dim mt-1">Crie seu primeiro plano para começar</p>
                        </div>
                    )}
                </div>

                {/* Ativo run / action request */}
                {runsLoading ? (
                    <SkeletonCard rows={4} />
                ) : activeRuns.length > 0 ? (
                    <div className="bento-card border-2 border-primary/20">
                        <div className="mb-4">
                            <span className="label-caps !text-primary">Execução ativa</span>
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
                            ) : activeRuns[0].status === 'pending_approval' ? (
                                <button
                                    onClick={() => showApprovalModal(activeRuns[0].id)}
                                    className="flex-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 rounded-xl py-3 font-black text-[10px] tracking-widest uppercase hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2"
                                >
                                    <AlertTriangle className="size-4" />
                                    Approve & Execute
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
                            <span className="label-caps">Sem execuções ativas</span>
                            <p className="text-xs text-text-dim mt-2">Não há execuções do orquestrador ativas no momento.</p>
                        </div>
                    </div>
                )}

                {/* Histórico de execuções */}
                <div className="bento-card">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold">Histórico de execuções</h3>
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
                            {fetched.map((run) => (
                                <div key={run.id} className="flex items-center justify-between p-3 bg-bg border border-border rounded-xl">
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
                                        <button
                                            onClick={() => { setRollbackRunId(run.id); setRollbackStep('0'); }}
                                            aria-label="Rollback run"
                                            title="Rollback run"
                                            className="p-1.5 rounded-md text-text-dim hover:text-primary hover:bg-card transition-colors"
                                        >
                                            <Undo2 className="size-3.5" />
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
                            
                            <Paginator
                                total={runs?.total || 0}
                                limit={limitRuns}
                                offset={offsetRuns}
                                onPageChange={setOffsetRuns}
                                className="rounded-xl border border-border mt-2"
                            />
                        </div>
                    ) : (
                        <p className="text-sm text-text-dim">Ainda não há execuções registradas.</p>
                    )}
                </div>
            </div>

            {/* Planos section */}
            <div className="bento-card mt-4">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Orchestration Planos</h3>
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
                ) : allPlanos.length > 0 ? (
                    <div className="space-y-3">
                        {allPlanos.map((plan) => (
                            <div key={plan.id} className="flex items-center justify-between gap-4 p-3 bg-bg border border-border rounded-xl">
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
                        
                        <Paginator
                            total={plans?.total || 0}
                            limit={limitPlanos}
                            offset={offsetPlanos}
                            onPageChange={setOffsetPlanos}
                            className="rounded-xl border border-border mt-2"
                        />
                    </div>
                ) : (
                    <p className="text-sm text-text-dim">Ainda não há planos.</p>
                )}
            </div>

            {auditPipelineId && (
                <AuditTrailModal
                    pipelineId={auditPipelineId}
                    onClose={() => setAuditPipelineId(null)}
                />
            )}

            <AnimatePresence>
                {rollbackRunId && (
                    <motion.div
                        key="rollback-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => !rollbackSubmitting && setRollbackRunId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bento-card w-full max-w-sm space-y-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest">Rollback da execução</h3>
                                <button
                                    onClick={() => setRollbackRunId(null)}
                                    disabled={rollbackSubmitting}
                                    className="rounded-lg p-1 text-text-dim hover:text-accent hover:bg-white/5 transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                            <p className="text-[10px] font-mono text-text-dim truncate">{rollbackRunId}</p>
                            <div>
                                <label className="label-caps text-text-dim block mb-1">Fazer rollback para etapa #</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={rollbackStep}
                                    onChange={e => setRollbackStep(e.target.value)}
                                    className="w-full rounded-lg bg-bg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={() => setRollbackRunId(null)}
                                    disabled={rollbackSubmitting}
                                    className="flex-1 rounded-lg border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitRollback}
                                    disabled={rollbackSubmitting}
                                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {rollbackSubmitting ? 'Rolling back…' : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Plan Creation Modal */}
            <AnimatePresence>
                {showPlanForm && (
                    <motion.div
                        key="plan-form-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => !isCreatingPlan && setShowPlanForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bento-card w-full max-w-lg space-y-4 max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest">Criar plano</h3>
                                <button
                                    onClick={() => !isCreatingPlan && setShowPlanForm(false)}
                                    className="p-1 rounded-lg hover:bg-bg transition-colors"
                                    disabled={isCreatingPlan}
                                >
                                    <X className="size-4 text-text-dim" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Objetivo */}
                                <div>
                                    <label className="block text-xs font-medium text-accent mb-2">
                                        Objetivo <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        value={planForm.objective}
                                        onChange={(e) => setPlanForm(prev => ({ ...prev, objective: e.target.value }))}
                                        placeholder="O que você quer que o KAIROS realize?"
                                        className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-highlight placeholder-text-dim focus:outline-none focus:border-primary/50 transition-colors resize-none"
                                        rows={3}
                                        disabled={isCreatingPlan}
                                    />
                                </div>

                                {/* Constraints */}
                                <div>
                                    <label className="block text-xs font-medium text-accent mb-2">
                                        Constraints
                                    </label>
                                    <div className="space-y-2">
                                        {planForm.constraints.map((constraint, index) => (
                                            <div key={`constraint-${index}`} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={constraint}
                                                    onChange={(e) => {
                                                        const newConstraints = [...planForm.constraints];
                                                        newConstraints[index] = e.target.value;
                                                        setPlanForm(prev => ({ ...prev, constraints: newConstraints }));
                                                    }}
                                                    placeholder="Adicionar uma restrição..."
                                                    className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-highlight placeholder-text-dim focus:outline-none focus:border-primary/50 transition-colors"
                                                    disabled={isCreatingPlan}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newConstraints = planForm.constraints.filter((_, i) => i !== index);
                                                        setPlanForm(prev => ({ ...prev, constraints: newConstraints }));
                                                    }}
                                                    className="p-2 text-text-dim hover:text-red-400 transition-colors"
                                                    disabled={isCreatingPlan}
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setPlanForm(prev => ({ ...prev, constraints: [...prev.constraints, ''] }))}
                                            className="w-full px-3 py-2 border border-dashed border-border rounded-lg text-sm text-text-dim hover:border-accent hover:text-accent transition-colors"
                                            disabled={isCreatingPlan}
                                        >
                                            + Adicionar restrição
                                        </button>
                                    </div>
                                </div>

                                {/* Priority and Reasoning Mode */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-accent mb-2">
                                            Priority
                                        </label>
                                        <select
                                            value={planForm.priority}
                                            onChange={(e) => setPlanForm(prev => ({ ...prev, priority: e.target.value as any }))}
                                            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-highlight focus:outline-none focus:border-primary/50 transition-colors"
                                            disabled={isCreatingPlan}
                                        >
                                            <option value="low">Baixa</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">Alta</option>
                                            <option value="critical">Crítica</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-accent mb-2">
                                            Reasoning Mode
                                        </label>
                                        <select
                                            value={planForm.reasoningMode}
                                            onChange={(e) => setPlanForm(prev => ({ ...prev, reasoningMode: e.target.value as any }))}
                                            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-highlight focus:outline-none focus:border-primary/50 transition-colors"
                                            disabled={isCreatingPlan}
                                        >
                                            <option value="standard">Padrão</option>
                                            <option value="extended">Estendido</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Deadline */}
                                <div>
                                    <label className="block text-xs font-medium text-accent mb-2">
                                        <Clock className="inline size-3 mr-1" />
                                        Deadline (minutes, optional)
                                    </label>
                                    <input
                                        type="number"
                                        value={planForm.deadlineMinutes || ''}
                                        onChange={(e) => setPlanForm(prev => ({ ...prev, deadlineMinutes: parseInt(e.target.value) || 0 }))}
                                        placeholder="Sem prazo"
                                        min="0"
                                        className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-highlight placeholder-text-dim focus:outline-none focus:border-primary/50 transition-colors"
                                        disabled={isCreatingPlan}
                                    />
                                </div>

                                {/* Policy Options */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-medium text-accent">
                                        <Shield className="inline size-3 mr-1" />
                                        Safety Policy
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={planForm.allowCódigoExecução}
                                                onChange={(e) => setPlanForm(prev => ({ ...prev, allowCódigoExecução: e.target.checked }))}
                                                className="rounded border-border bg-bg text-primary focus:ring-primary/50"
                                                disabled={isCreatingPlan}
                                            />
                                            <span className="text-sm text-highlight">Permitir execução de código</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={planForm.requireApproval}
                                                onChange={(e) => setPlanForm(prev => ({ ...prev, requireApproval: e.target.checked }))}
                                                className="rounded border-border bg-bg text-primary focus:ring-primary/50"
                                                disabled={isCreatingPlan}
                                            />
                                            <span className="text-sm text-highlight">Exigir aprovação para operações sensíveis</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => !isCreatingPlan && setShowPlanForm(false)}
                                        className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-text-dim hover:bg-bg transition-colors"
                                        disabled={isCreatingPlan}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={createPlan}
                                        disabled={isCreatingPlan || !planForm.objective.trim()}
                                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCreatingPlan ? 'Criando...' : 'Criar plano'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Approval Modal */}
            <AnimatePresence>
                {approvalRunId && approvalContext && (
                    <motion.div
                        key="approval-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => !isApproving && setApprovalRunId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bento-card w-full max-w-lg space-y-4 max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-yellow-400" />
                                    Approval Required
                                </h3>
                                <button
                                    onClick={() => !isApproving && setApprovalRunId(null)}
                                    className="p-1 rounded-lg hover:bg-bg transition-colors"
                                    disabled={isApproving}
                                >
                                    <X className="size-4 text-text-dim" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Objetivo do plano */}
                                <div>
                                    <h4 className="text-xs font-medium text-accent mb-2">Objetivo do plano</h4>
                                    <div className="p-3 bg-bg border border-border rounded-lg">
                                        <p className="text-sm text-highlight">
                                            {approvalContext.plan?.objective || 'Unknown objective'}
                                        </p>
                                    </div>
                                </div>

                                {/* What the agent wants to do */}
                                <div>
                                    <h4 className="text-xs font-medium text-accent mb-2">Execução Details</h4>
                                    <div className="p-3 bg-bg border border-border rounded-lg">
                                        <div className="space-y-2 text-sm text-text-dim">
                                            <div className="flex justify-between">
                                                <span>ID da execução:</span>
                                                <span className="font-mono text-accent">{approvalRunId.slice(0, 8)}…</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Status:</span>
                                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                                    {approvalContext.run.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Criado:</span>
                                                <span>{new Date(approvalContext.run.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Policy Context */}
                                {approvalContext.audits && approvalContext.audits.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-accent mb-2 flex items-center gap-2">
                                            <Shield className="size-3" />
                                            Policy Context
                                        </h4>
                                        <div className="space-y-2">
                                            {approvalContext.audits.map((audit: any, index: number) => (
                                                <div key={`audit-${index}`} className="p-3 bg-bg border border-border rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-accent">
                                                            {audit.mode === 'controlled-red-team' ? 'Controlled Red Team' : 'Defensive'}
                                                        </span>
                                                        <span className={cn(
                                                            'text-xs px-2 py-0.5 rounded-full',
                                                            audit.decision === 'auto-blocked' ? 'bg-red-500/20 text-red-400' :
                                                            audit.decision === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                            'bg-yellow-500/20 text-yellow-400'
                                                        )}>
                                                            {audit.decision}
                                                        </span>
                                                    </div>
                                                    {audit.reason && (
                                                        <p className="text-xs text-text-dim">{audit.reason}</p>
                                                    )}
                                                    {audit.blockedCapacidades && audit.blockedCapacidades.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="text-xs text-text-dim mb-1">Capacidades bloqueadas:</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {audit.blockedCapacidades.map((cap: string, i: number) => (
                                                                    <span key={`cap-${i}-${cap}`} className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">
                                                                        {cap}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Warning */}
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="size-4 text-yellow-400 shrink-0 mt-0.5" />
                                        <div className="text-xs text-yellow-400">
                                            <p className="font-medium mb-1">Aviso de segurança</p>
                                            <p>Esta execução requer aprovação manual antes de iniciar. Revise o plano e o contexto de política acima antes de prosseguir.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => !isApproving && setApprovalRunId(null)}
                                        className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-text-dim hover:bg-bg transition-colors"
                                        disabled={isApproving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={approveAndExecute}
                                        disabled={isApproving}
                                        className="flex-1 px-4 py-2 bg-yellow-500 text-yellow-50 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isApproving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin" />
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="size-4" />
                                                Approve & Execute
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Plan Detail Modal */}
            <AnimatePresence>
                {selectedPlan && (
                    <motion.div
                        key="plan-detail-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setSelectedPlan(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bento-card w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h3 className="text-sm font-bold uppercase tracking-widest">Detalhes do plano</h3>
                                <button
                                    onClick={() => setSelectedPlan(null)}
                                    className="p-1 rounded-lg hover:bg-bg transition-colors"
                                >
                                    <X className="size-4 text-text-dim" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Plan Header */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-xs font-medium text-accent mb-2">Objetivo</h4>
                                        <p className="text-sm text-highlight">{selectedPlan.objective}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-dim">Complexidade:</span>
                                            <span className={cn(
                                                'px-2 py-0.5 rounded-full text-xs',
                                                selectedPlan.complexityScore > 70 ? 'bg-red-500/20 text-red-400' :
                                                selectedPlan.complexityScore > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-green-500/20 text-green-400'
                                            )}>
                                                {selectedPlan.complexityScore}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-dim">Modo de raciocínio:</span>
                                            <span className="text-accent">{selectedPlan.reasoningMode}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-dim">Status:</span>
                                            <span className={cn(
                                                'px-2 py-0.5 rounded-full text-xs',
                                                selectedPlan.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                selectedPlan.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            )}>
                                                {selectedPlan.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-dim">Criado:</span>
                                            <span className="text-accent">{new Date(selectedPlan.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Runs Section */}
                                <div>
                                    <h4 className="text-xs font-medium text-accent mb-3">Runs ({planRuns.length})</h4>
                                    {loadingPlanDetails ? (
                                        <div className="space-y-2">
                                            {[0, 1].map(i => (
                                                <div key={i} className="p-3 bg-bg border border-border rounded-lg">
                                                    <Skeleton className="h-4 w-24 mb-2" />
                                                    <Skeleton className="h-3 w-32" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : planRuns.length > 0 ? (
                                        <div className="space-y-2">
                                            {planRuns.map((run) => (
                                                <div key={run.id} className="p-3 bg-bg border border-border rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono text-xs text-accent">{run.id.slice(0, 8)}…</span>
                                                            <span className={cn(
                                                                'text-xs px-2 py-0.5 rounded-full',
                                                                run.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                                                                run.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                                run.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                                run.status === 'pending_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                            )}>
                                                                {run.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-text-dim">
                                                                {new Date(run.createdAt).toLocaleString()}
                                                            </span>
                                                            <button
                                                                onClick={() => fetchRunTasks(run.id)}
                                                                className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                                                            >
                                                                {selectedRunForTasks === run.id ? 'Hide Tasks' : 'View Tasks'}
                                                            </button>
                                                            {run.status === 'failed' && (run as any).snapshotId && (
                                                                <button
                                                                    onClick={() => handleRollbackRun(run.id, (run as any).snapshotId)}
                                                                    className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                                                                >
                                                                    <RotateCcw className="size-3" />
                                                                    Rollback
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {selectedRunForTasks === run.id && (
                                                        <div className="mt-4 pt-4 border-t border-border">
                                                            {loadingTasks ? (
                                                                <div className="space-y-2">
                                                                    {[0, 1].map(i => (
                                                                        <Skeleton key={i} className="h-10 w-full" />
                                                                    ))}
                                                                </div>
                                                            ) : runTasks.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Tasks ({runTasks.length})</h5>
                                                                    {runTasks.map(task => (
                                                                        <div key={task.id} className="p-2 bg-card border border-border rounded flex flex-col gap-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-xs font-bold text-accent truncate">{task.description}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        onClick={() => fetchTaskLogs(task.id)}
                                                                                        className="text-[9px] font-bold uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
                                                                                    >
                                                                                        {selectedTaskForLogs === task.id ? 'Hide Logs' : 'View Logs'}
                                                                                    </button>
                                                                                    <span className={cn(
                                                                                        'text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded',
                                                                                        task.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                                                                        task.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                                                                                        task.status === 'running' ? 'bg-blue-500/10 text-blue-400' :
                                                                                        'bg-zinc-500/10 text-zinc-400'
                                                                                    )}>
                                                                                        {task.status}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-[10px] font-mono text-text-dim">Tipo: {task.type}</span>
                                                                            
                                                                            {selectedTaskForLogs === task.id && (
                                                                                <div className="mt-2 p-2 bg-bg/50 rounded border border-border/40 space-y-1.5 max-h-40 overflow-y-auto">
                                                                                    {loadingLogs ? (
                                                                                        <Skeleton className="h-10 w-full" />
                                                                                    ) : taskLogs.length > 0 ? (
                                                                                        taskLogs.map((log, idx) => (
                                                                                            <div key={idx} className="text-[9px] font-mono leading-relaxed border-b border-border/20 last:border-0 pb-1 last:pb-0">
                                                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                                                    <span className="text-text-dim">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                                                                                    <span className={cn(
                                                                                                        'px-1 rounded-sm uppercase font-black',
                                                                                                        log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                                                                                                        log.level === 'warn' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                                                        'bg-primary/10 text-primary'
                                                                                                    )}>
                                                                                                        {log.level}
                                                                                                    </span>
                                                                                                    <span className="text-accent/60 italic">{log.phase}</span>
                                                                                                </div>
                                                                                                <p className="text-highlight/80">{log.message}</p>
                                                                                            </div>
                                                                                        ))
                                                                                    ) : (
                                                                                        <p className="text-[9px] text-text-dim text-center py-1">Não há logs disponíveis para esta tarefa.</p>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-text-dim text-center py-2">Nenhuma tarefa encontrada para esta execução.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-bg border border-border rounded-lg">
                                            <p className="text-sm text-text-dim">Ainda não há execuções para este plano</p>
                                        </div>
                                    )}
                                </div>

                                {/* Checkpoints Section */}
                                {planCheckpoints.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-accent mb-3">Checkpoints ({planCheckpoints.length})</h4>
                                        <div className="space-y-2">
                                            {planCheckpoints.map((checkpoint, index) => (
                                                <div key={`checkpoint-${checkpoint.step}`} className="p-3 bg-bg border border-border rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-accent">Step {checkpoint.step}</span>
                                                        <span className="text-xs text-text-dim">
                                                            {new Date(checkpoint.at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-text-dim mb-2">{checkpoint.note}</p>
                                                    {checkpoint.state && (
                                                        <details className="text-xs">
                                                            <summary className="cursor-pointer text-accent hover:text-highlight">Ver estado</summary>
                                                            <pre className="mt-2 p-2 bg-card border border-border rounded text-text-dim whitespace-pre-wrap break-words">
                                                                {JSON.stringify(checkpoint.state, null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
