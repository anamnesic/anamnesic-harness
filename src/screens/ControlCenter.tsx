'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, ScrollText, Undo2, X, Plus, Target, Clock, Shield, AlertTriangle, CheckCircle, Play } from 'lucide-react';
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
        allowCodeExecution: false,
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

    async function createPlan() {
        if (!planForm.objective.trim()) {
            toast('Objective is required', 'error');
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
                        allowCodeExecution: planForm.allowCodeExecution,
                        requireHumanApprovalForSensitiveOps: planForm.requireApproval,
                    },
                }),
            });
            
            toast('Plan created successfully', 'success');
            setShowPlanForm(false);
            setPlanForm({
                objective: '',
                constraints: [],
                priority: 'normal',
                deadlineMinutes: 0,
                reasoningMode: 'standard',
                allowCodeExecution: false,
                requireApproval: true,
            });
            refetch();
        } catch (e: any) {
            toast(e.message || 'Failed to create plan', 'error');
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
                plan: allPlans.find(p => p.id === runDetails.planId)
            });
            setApprovalRunId(runId);
        } catch (e: any) {
            toast('Failed to load approval context', 'error');
        }
    }

    async function approveAndExecute() {
        if (!approvalRunId) return;
        
        setIsApproving(true);
        try {
            await apiFetch(`/api/v1/orchestrator/runs/${approvalRunId}/execute`, { method: 'POST' });
            toast('Run approved and executed', 'success');
            setApprovalRunId(null);
            setApprovalContext(null);
            refetch();
        } catch (e: any) {
            toast(e.message || 'Failed to approve run', 'error');
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
            toast('Failed to load plan details', 'error');
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
            toast('Step must be a non-negative integer', 'error');
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
            toast(e.message ?? 'Rollback failed', 'error');
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
            toast('Failed to load tasks for run', 'error');
            setRunTasks([]);
        } finally {
            setLoadingTasks(false);
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
                {/* Plans Section */}
                <div className="bento-card">
                    <div className="flex items-center justify-between mb-4">
                        <span className="label-caps">Plans</span>
                        <button
                            onClick={() => setShowPlanForm(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            <Plus className="size-4" />
                            Create Plan
                        </button>
                    </div>
                    
                    {plansLoading ? (
                        <SkeletonCard rows={3} />
                    ) : allPlans.length > 0 ? (
                        <div className="space-y-2">
                            {allPlans.slice(0, 3).map((plan) => (
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
                            {allPlans.length > 3 && (
                                <div className="text-xs text-text-dim text-center py-2">
                                    +{allPlans.length - 3} more plans
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Target className="size-8 text-text-dim mx-auto mb-2" />
                            <p className="text-sm text-text-dim">No plans yet</p>
                            <p className="text-xs text-text-dim mt-1">Create your first plan to get started</p>
                        </div>
                    )}
                </div>

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
                            {recent.map((run) => (
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
                        {allPlans.map((plan) => (
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
                                <h3 className="text-sm font-bold uppercase tracking-widest">Rollback Run</h3>
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
                                <label className="label-caps text-text-dim block mb-1">Rollback to step #</label>
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
                                <h3 className="text-sm font-bold uppercase tracking-widest">Create Plan</h3>
                                <button
                                    onClick={() => !isCreatingPlan && setShowPlanForm(false)}
                                    className="p-1 rounded-lg hover:bg-bg transition-colors"
                                    disabled={isCreatingPlan}
                                >
                                    <X className="size-4 text-text-dim" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Objective */}
                                <div>
                                    <label className="block text-xs font-medium text-accent mb-2">
                                        Objective <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        value={planForm.objective}
                                        onChange={(e) => setPlanForm(prev => ({ ...prev, objective: e.target.value }))}
                                        placeholder="What do you want KAIROS to accomplish?"
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
                                                    placeholder="Add a constraint..."
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
                                            + Add Constraint
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
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="critical">Critical</option>
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
                                            <option value="standard">Standard</option>
                                            <option value="extended">Extended</option>
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
                                        placeholder="No deadline"
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
                                                checked={planForm.allowCodeExecution}
                                                onChange={(e) => setPlanForm(prev => ({ ...prev, allowCodeExecution: e.target.checked }))}
                                                className="rounded border-border bg-bg text-primary focus:ring-primary/50"
                                                disabled={isCreatingPlan}
                                            />
                                            <span className="text-sm text-highlight">Allow code execution</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={planForm.requireApproval}
                                                onChange={(e) => setPlanForm(prev => ({ ...prev, requireApproval: e.target.checked }))}
                                                className="rounded border-border bg-bg text-primary focus:ring-primary/50"
                                                disabled={isCreatingPlan}
                                            />
                                            <span className="text-sm text-highlight">Require approval for sensitive operations</span>
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
                                        {isCreatingPlan ? 'Creating...' : 'Create Plan'}
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
                                {/* Plan Objective */}
                                <div>
                                    <h4 className="text-xs font-medium text-accent mb-2">Plan Objective</h4>
                                    <div className="p-3 bg-bg border border-border rounded-lg">
                                        <p className="text-sm text-highlight">
                                            {approvalContext.plan?.objective || 'Unknown objective'}
                                        </p>
                                    </div>
                                </div>

                                {/* What the agent wants to do */}
                                <div>
                                    <h4 className="text-xs font-medium text-accent mb-2">Execution Details</h4>
                                    <div className="p-3 bg-bg border border-border rounded-lg">
                                        <div className="space-y-2 text-sm text-text-dim">
                                            <div className="flex justify-between">
                                                <span>Run ID:</span>
                                                <span className="font-mono text-accent">{approvalRunId.slice(0, 8)}…</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Status:</span>
                                                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                                    {approvalContext.run.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Created:</span>
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
                                                    {audit.blockedCapabilities && audit.blockedCapabilities.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="text-xs text-text-dim mb-1">Blocked capabilities:</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {audit.blockedCapabilities.map((cap: string, i: number) => (
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
                                            <p className="font-medium mb-1">Safety Notice</p>
                                            <p>This run requires manual approval before execution. Review the plan and policy context above before proceeding.</p>
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
                                <h3 className="text-sm font-bold uppercase tracking-widest">Plan Details</h3>
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
                                        <h4 className="text-xs font-medium text-accent mb-2">Objective</h4>
                                        <p className="text-sm text-highlight">{selectedPlan.objective}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-dim">Complexity:</span>
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
                                            <span className="text-text-dim">Reasoning Mode:</span>
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
                                            <span className="text-text-dim">Created:</span>
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
                                                                            <span className="text-[10px] font-mono text-text-dim">Type: {task.type}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-text-dim text-center py-2">No tasks found for this run.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-bg border border-border rounded-lg">
                                            <p className="text-sm text-text-dim">No runs yet for this plan</p>
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
                                                            <summary className="cursor-pointer text-accent hover:text-highlight">View State</summary>
                                                            <pre className="mt-2 p-2 bg-card border border-border rounded text-text-dim overflow-x-auto">
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
