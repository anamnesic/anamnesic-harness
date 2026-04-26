'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Trash2, Workflow as WorkflowIcon, Pause, Play, ChevronLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';

type WorkflowStatus = 'active' | 'paused' | 'archived';
type TriggerType = 'cron' | 'event' | 'manual' | 'webhook';

interface WorkflowStep {
    id: string;
    name: string;
    description?: string;
    agentId: string;
    taskTipo: string;
    input: Record<string, any>;
    dependsOn?: string[];
    timeout?: number;
}

interface WorkflowTrigger {
    type: TriggerType;
    config: Record<string, any>;
}

interface WorkflowExecução {
    id: string;
    startedAt: string;
    completedAt?: string;
    status: 'running' | 'completed' | 'failed' | 'paused';
    tasksRun: number;
    tasksFailed: number;
    error?: string;
}

interface Workflow {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    steps: WorkflowStep[];
    triggers: WorkflowTrigger[];
    schedule: string | null;
    status: WorkflowStatus;
    totalExecuçãos: number;
    successfulExecuçãos: number;
    failedExecuçãos: number;
    lastExecutedAt: string | null;
    createdAt: string;
}

const STATUS_STYLES: Record<WorkflowStatus, string> = {
    active: 'bg-green-500/15 text-green-400',
    paused: 'bg-yellow-500/15 text-yellow-400',
    archived: 'bg-zinc-500/15 text-zinc-400',
};

const STATUS_DOT: Record<WorkflowStatus, string> = {
    active: 'bg-green-400',
    paused: 'bg-yellow-400',
    archived: 'bg-zinc-400',
};

const EXEC_STATUS_STYLES: Record<WorkflowExecução['status'], string> = {
    running: 'bg-primary/15 text-primary',
    completed: 'bg-green-500/15 text-green-400',
    failed: 'bg-red-500/15 text-red-400',
    paused: 'bg-yellow-500/15 text-yellow-400',
};

const TRIGGER_TYPES: TriggerType[] = ['manual', 'cron', 'event', 'webhook'];

function formatDate(d: string | null | undefined) {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return '—'; }
}

function formatDuration(start: string, end?: string) {
    if (!end) return '—';
    try {
        const ms = new Date(end).getTime() - new Date(start).getTime();
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    } catch { return '—'; }
}

function HistoryPanel({ workflowId, workflowName, onBack }: { workflowId: string; workflowName: string; onBack: () => void }) {
    const { data, loading } = useApi<any>(`/api/v1/workflows/${workflowId}/history?limit=50`);
    const history: WorkflowExecução[] = (data as any)?.data ?? data ?? [];
    const sorted = Array.isArray(history) ? [...history].reverse() : [];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
        >
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="rounded-lg p-1.5 text-text-dim hover:text-accent hover:bg-white/5 transition-colors"
                    aria-label="Back"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <div className="min-w-0">
                    <p className="label-caps text-text-dim">Execução History</p>
                    <h3 className="font-bold text-base truncate">{workflowName}</h3>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <Clock className="size-8 text-border" />
                    <p className="text-text-dim text-sm">Ainda não há execuções</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {sorted.map(exec => (
                        <div key={exec.id} className="bento-card p-3! space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <span className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                                    EXEC_STATUS_STYLES[exec.status]
                                )}>
                                    {exec.status}
                                </span>
                                <span className="text-[11px] text-text-dim font-mono">{formatDate(exec.startedAt)}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-text-dim">
                                <span className="flex items-center gap-1">
                                    <CheckCircle2 className="size-3 text-green-400" />
                                    <span className="text-accent font-semibold">{exec.tasksRun}</span> run
                                </span>
                                <span className="flex items-center gap-1">
                                    <XCircle className="size-3 text-red-400" />
                                    <span className="text-accent font-semibold">{exec.tasksFailed}</span> failed
                                </span>
                                {exec.completedAt && (
                                    <span className="ml-auto label-caps">
                                        {formatDuration(exec.startedAt, exec.completedAt)}
                                    </span>
                                )}
                            </div>
                            {exec.error && (
                                <p className="text-[11px] text-red-400 font-mono leading-relaxed border-t border-border/40 pt-2">
                                    {exec.error}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export function Workflows() {
    const { data, loading, refetch } = useApi<any>('/api/v1/workflows');
    const { toast } = useToast();
    const { workspace } = useWorkspace();

    const [showModal, setShowModal] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [schedule, setSchedule] = useState('');
    const [stepsJson, setStepsJson] = useState('[\n  {\n    "id": "s1",\n    "name": "Initial Análise",\n    "agentId": "agent-uuid",\n    "taskType": "research",\n    "input": { "query": "Analyze project structure" }\n  }\n]');
    const [triggerType, setTriggerType] = useState<TriggerType>('manual');

    const workflows: Workflow[] = (data as any)?.data ?? data ?? [];
    const list = Array.isArray(workflows) ? workflows : [];

    const totalWorkflows = list.length;
    const activeWorkflows = list.filter(w => w.status === 'active').length;
    const totalExecuçãos = list.reduce((sum, w) => sum + (w.totalExecuçãos ?? 0), 0);
    const totalSuccess = list.reduce((sum, w) => sum + (w.successfulExecuçãos ?? 0), 0);
    const successRate = totalExecuçãos > 0 ? Math.round((totalSuccess / totalExecuçãos) * 100) : 0;

    const selected = selectedId ? list.find(w => w.id === selectedId) : null;

    function closeModal() {
        setShowModal(false);
        setName('');
        setDescription('');
        setSchedule('');
        setStepsJson('[\n  {\n    "id": "s1",\n    "name": "Initial Análise",\n    "agentId": "agent-uuid",\n    "taskType": "research",\n    "input": { "query": "Analyze project structure" }\n  }\n]');
        setTriggerType('manual');
    }

    async function handleSubmit() {
        if (!name.trim()) { toast('Nome é obrigatório', 'error'); return; }
        if (!workspace) { toast('Nenhum workspace ativo', 'error'); return; }

        let parsedSteps: WorkflowStep[] = [];
        if (stepsJson.trim()) {
            try {
                parsedSteps = JSON.parse(stepsJson);
                if (!Array.isArray(parsedSteps)) throw new Error('Steps must be an array');
            } catch (e: any) {
                toast(`Invalid steps JSON: ${e.message}`, 'error');
                return;
            }
        }

        setSubmitting(true);
        try {
            await apiFetch('/api/v1/workflows', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    workspaceId: workspace.id,
                    schedule: schedule.trim() || undefined,
                    steps: parsedSteps,
                    triggers: [{ type: triggerType, config: {} }],
                }),
            });
            toast('Workflow created', 'success');
            refetch();
            closeModal();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao criar workflow', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string, wfName: string) {
        try {
            await apiFetch(`/api/v1/workflows/${id}`, { method: 'DELETE' });
            toast(`Workflow "${wfName}" deleted`, 'success');
            if (selectedId === id) setSelectedId(null);
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao excluir workflow', 'error');
        }
    }

    async function handleToggleStatus(id: string, current: WorkflowStatus) {
        const next: WorkflowStatus = current === 'active' ? 'paused' : 'active';
        try {
            await apiFetch(`/api/v1/workflows/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: next }),
            });
            toast(`Workflow ${next}`, 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao atualizar status', 'error');
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
        >
            <AnimatePresence mode="wait">
                {selected ? (
                    <HistoryPanel
                        key="history"
                        workflowId={selected.id}
                        workflowName={selected.name}
                        onBack={() => setSelectedId(null)}
                    />
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Header */}
                        <div className="mb-8 flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
                            <button
                                onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                            >
                                <Plus className="size-3.5" />
                                New Workflow
                            </button>
                        </div>

                        {/* Stats row */}
                        <div className="mb-6 grid grid-cols-4 gap-3">
                            {[
                                { label: 'Total', value: totalWorkflows },
                                { label: 'Ativo', value: activeWorkflows },
                                { label: 'Execuçãos', value: totalExecuçãos },
                                { label: 'Taxa de sucesso', value: `${successRate}%` },
                            ].map(stat => (
                                <div key={stat.label} className="bento-card text-center">
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="label-caps text-text-dim mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* List */}
                        {loading ? (
                            <div className="space-y-4">
                                {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : list.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-3">
                                <WorkflowIcon className="size-10 text-border" />
                                <p className="text-text-dim text-sm">Nenhum workflow configurado</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {list.map(wf => (
                                    <button
                                        key={wf.id}
                                        onClick={() => setSelectedId(wf.id)}
                                        className="bento-card space-y-3 w-full text-left hover:border-primary/40 transition-colors"
                                    >
                                        {/* Top row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-bold text-accent truncate">{wf.name}</span>
                                                <span className={cn(
                                                    'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shrink-0',
                                                    STATUS_STYLES[wf.status]
                                                )}>
                                                    <span className={cn('size-1.5 rounded-full', STATUS_DOT[wf.status])} />
                                                    {wf.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                {wf.status !== 'archived' && (
                                                    <button
                                                        onClick={() => handleToggleStatus(wf.id, wf.status)}
                                                        className="rounded-lg p-1 text-text-dim hover:text-accent hover:bg-white/5 transition-colors"
                                                        aria-label={wf.status === 'active' ? 'Pause' : 'Activate'}
                                                    >
                                                        {wf.status === 'active'
                                                            ? <Pause className="size-3.5" />
                                                            : <Play className="size-3.5" />}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(wf.id, wf.name)}
                                                    className="rounded-lg p-1 text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    aria-label="Delete workflow"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {wf.description && (
                                            <p className="text-sm text-text-dim leading-relaxed">{wf.description}</p>
                                        )}

                                        {/* Triggers */}
                                        {wf.triggers?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {wf.triggers.map((t, i) => (
                                                    <span
                                                        key={i}
                                                        className="rounded-md bg-white/5 border border-border px-2 py-0.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider"
                                                    >
                                                        {t.type}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Meta */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-dim">
                                            <span>
                                                <span className="text-accent font-semibold">{wf.steps?.length ?? 0}</span> steps
                                            </span>
                                            {wf.schedule && (
                                                <span className="font-mono text-[11px] bg-white/5 rounded px-1.5 py-0.5">
                                                    {wf.schedule}
                                                </span>
                                            )}
                                            <span>
                                                <span className="text-green-400 font-semibold">{wf.successfulExecuçãos ?? 0}</span> ok
                                            </span>
                                            <span>
                                                <span className="text-red-400 font-semibold">{wf.failedExecuçãos ?? 0}</span> failed
                                            </span>
                                            <span className="ml-auto label-caps">
                                                {wf.lastExecutedAt ? formatDate(wf.lastExecutedAt) : 'never run'}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Workflow Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        key="workflow-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ duration: 0.15 }}
                            className="bento-card w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base">New Workflow</h3>
                                <button onClick={closeModal} className="rounded-lg p-1 text-text-dim hover:text-accent transition-colors">
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="label-caps block mb-1">Name</label>
                                    <input
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Nome do workflow"
                                    />
                                </div>

                                <div>
                                    <label className="label-caps block mb-1">Description</label>
                                    <textarea
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                                        rows={2}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Descrição opcional"
                                    />
                                </div>

                                <div>
                                    <label className="label-caps block mb-1">Schedule (cron, optional)</label>
                                    <input
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors font-mono"
                                        value={schedule}
                                        onChange={e => setSchedule(e.target.value)}
                                        placeholder="0 * * * *"
                                    />
                                </div>

                                <div>
                                    <label className="label-caps block mb-1">Trigger Type</label>
                                    <select
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={triggerType}
                                        onChange={e => setTriggerType(e.target.value as TriggerType)}
                                    >
                                        {TRIGGER_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="label-caps block mb-1">Steps (JSON)</label>
                                    <textarea
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-xs font-mono outline-none focus:border-primary/60 transition-colors resize-none"
                                        rows={5}
                                        value={stepsJson}
                                        onChange={e => setStepsJson(e.target.value)}
                                        placeholder='[{"id":"s1","name":"Step 1","agentId":"agent-id","taskType":"task","input":{}}]'
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    onClick={closeModal}
                                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text-dim hover:border-border/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="rounded-xl bg-primary/90 hover:bg-primary px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Criando...' : 'Criar workflow'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
