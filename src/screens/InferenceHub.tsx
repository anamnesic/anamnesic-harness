'use client';

import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
    Brain,
    Calendar,
    Layers,
    Play,
    RefreshCcw,
    Search,
    ShieldCheck,
} from 'lucide-react';
import { apiFetch, useApi } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard, SkeletonRow } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

interface InferenceTask {
    id: string;
    status: TaskStatus;
    enqueuedAt: string;
    startedAt?: string;
    endedAt?: string;
    request: {
        preferredProvider: string;
        promptClass?: 'operational' | 'sensitive';
    };
    result?: {
        provider: string;
        command: string;
        exitCode: number | null;
        durationMs: number;
    };
    error?: string;
}

interface InferenceJobsResponse {
    tasks: InferenceTask[];
    stats: {
        queued: number;
        running: number;
        completed: number;
        failed: number;
    };
}

interface SemanticSummariesResponse {
    items: Array<{
        date: string;
        narrativeSummary?: string | null;
        provider?: string | null;
        exitCode?: number | null;
    }>;
    count: number;
}

interface ProactiveInsightsResponse {
    generatedAt: string;
    provider: string;
    command: string;
    inputEvents: number;
    plan: {
        recommendations: Array<{ title: string; rationale: string; action: string }>;
        risks: Array<{ title: string; severity: string; evidence: string; recommendedAction: string }>;
        opportunities: Array<{ title: string; impact: string; evidence: string; suggestedAction: string }>;
    };
}

interface RecallResponse {
    query: string;
    tokenEstimate: number;
    items: Array<{
        rank: number;
        key: string;
        value: string;
        category: string;
        score: number;
        reason?: string;
    }>;
}

const STATUS_STYLES: Record<TaskStatus, string> = {
    queued: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    running: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    completed: 'bg-green-500/15 text-green-300 border-green-500/30',
    failed: 'bg-red-500/15 text-red-300 border-red-500/30',
};

function formatDate(iso?: string): string {
    if (!iso) {
        return '—';
    }
    return new Date(iso).toLocaleString();
}

export function InferenceHub() {
    const { toast } = useToast();

    const { data: jobsData, loading: jobsLoading, refetch: refetchJobs } = useApi<InferenceJobsResponse>('/api/v1/inference/jobs');
    const { data: summariesData, loading: summariesLoading, refetch: refetchSummaries } = useApi<SemanticSummariesResponse>('/api/v1/summaries/semantic?limit=12');
    const { data: proactiveData, loading: proactiveLoading, refetch: refetchProactive } = useApi<ProactiveInsightsResponse>('/api/v1/proactive/insights');

    const [enqueuePrompt, setEnqueuePrompt] = useState('');
    const [enqueueBusy, setEnqueueBusy] = useState(false);
    const [recallQuery, setRecallQuery] = useState('');
    const [recallBusy, setRecallBusy] = useState(false);
    const [recallData, setRecallData] = useState<RecallResponse | null>(null);

    const sortedTasks = useMemo(() => {
        const tasks = jobsData?.tasks ?? [];
        return [...tasks]
            .sort((a, b) => b.enqueuedAt.localeCompare(a.enqueuedAt))
            .slice(0, 12);
    }, [jobsData?.tasks]);

    async function handleEnqueue(e: FormEvent) {
        e.preventDefault();
        const prompt = enqueuePrompt.trim();
        if (!prompt) {
            toast('Prompt é obrigatório para criar um job', 'error');
            return;
        }

        setEnqueueBusy(true);
        try {
            await apiFetch('/api/v1/inference/jobs', {
                method: 'POST',
                body: JSON.stringify({ prompt, promptClass: 'operational' }),
            });
            setEnqueuePrompt('');
            await refetchJobs();
            toast('Job de inferência enfileirado', 'success');
        } catch (error) {
            toast('Falha ao criar job de inferência', 'error');
        } finally {
            setEnqueueBusy(false);
        }
    }

    async function handleRecall(e: FormEvent) {
        e.preventDefault();
        const query = recallQuery.trim();
        if (!query) {
            toast('Informe uma consulta para rerank', 'error');
            return;
        }

        setRecallBusy(true);
        try {
            const response = await apiFetch<RecallResponse>('/api/v1/recall/reranked', {
                method: 'POST',
                body: JSON.stringify({ query, tokenBudget: 2200 }),
            });
            setRecallData(response);
            toast('Recall reranqueado atualizado', 'success');
        } catch {
            toast('Falha ao executar recall reranqueado', 'error');
        } finally {
            setRecallBusy(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-6xl mx-auto w-full space-y-4"
        >
            <div className="bento-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <span className="label-caps">Inference Hub</span>
                        <h2 className="text-2xl font-bold tracking-tight mt-2">Jobs, Memória Semântica e Insights</h2>
                        <p className="text-xs text-text-dim mt-1">Painel unificado para inferência em background com provenance de provider e comando.</p>
                    </div>
                    <button
                        onClick={() => {
                            void Promise.all([refetchJobs(), refetchSummaries(), refetchProactive()]);
                        }}
                        className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                    >
                        <RefreshCcw className="size-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="bento-card xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Jobs de inferência</span>
                        <div className="text-[10px] uppercase tracking-widest text-text-dim font-bold">
                            {jobsData ? `Q:${jobsData.stats.queued} R:${jobsData.stats.running} C:${jobsData.stats.completed} F:${jobsData.stats.failed}` : '—'}
                        </div>
                    </div>

                    <form onSubmit={handleEnqueue} className="space-y-2">
                        <textarea
                            value={enqueuePrompt}
                            onChange={(event) => setEnqueuePrompt(event.target.value)}
                            placeholder="Descreva o prompt para criar um job em background..."
                            className="w-full min-h-20 resize-y rounded-xl border border-border bg-bg px-3 py-2 text-sm text-accent placeholder:text-text-dim focus:outline-none focus:border-primary"
                        />
                        <button
                            type="submit"
                            disabled={enqueueBusy}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition-opacity',
                                enqueueBusy && 'opacity-60 cursor-not-allowed',
                            )}
                        >
                            <Play className="size-3.5" />
                            Enfileirar job
                        </button>
                    </form>

                    {jobsLoading ? (
                        <div className="space-y-2">
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    ) : sortedTasks.length === 0 ? (
                        <p className="text-xs text-text-dim">Nenhum job registrado ainda.</p>
                    ) : (
                        <div className="space-y-2">
                            {sortedTasks.map((task) => (
                                <div key={task.id} className="rounded-xl border border-border bg-bg p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-xs font-mono text-accent">{task.id.slice(0, 8)}...</div>
                                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider', STATUS_STYLES[task.status])}>
                                            {task.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                        <p className="text-text-dim">Provider solicitado: <span className="font-bold text-accent">{task.request.preferredProvider}</span></p>
                                        <p className="text-text-dim">Provider executado: <span className="font-bold text-accent">{task.result?.provider ?? '—'}</span></p>
                                        <p className="text-text-dim">Comando: <span className="font-mono text-accent">{task.result?.command ?? '—'}</span></p>
                                        <p className="text-text-dim">Exit code: <span className="font-bold text-accent">{task.result?.exitCode ?? '—'}</span></p>
                                        <p className="text-text-dim">Enfileirado: <span className="text-accent">{formatDate(task.enqueuedAt)}</span></p>
                                        <p className="text-text-dim">Duração: <span className="text-accent">{task.result?.durationMs ? `${task.result.durationMs}ms` : '—'}</span></p>
                                    </div>
                                    {task.error && (
                                        <p className="mt-2 text-[11px] text-red-300">Erro: {task.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bento-card space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Memória consolidada</span>
                        <Calendar className="size-4 text-primary" />
                    </div>
                    {summariesLoading ? (
                        <>
                            <SkeletonCard />
                            <SkeletonCard />
                        </>
                    ) : (summariesData?.items ?? []).length === 0 ? (
                        <p className="text-xs text-text-dim">Sem summaries semânticos disponíveis.</p>
                    ) : (
                        <div className="space-y-2">
                            {summariesData?.items.map((item) => (
                                <div key={item.date} className="rounded-xl border border-border bg-bg p-3">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-text-dim">{item.date}</p>
                                    <p className="text-xs text-accent mt-1 line-clamp-3">{item.narrativeSummary || 'Sem narrativa disponível.'}</p>
                                    <div className="mt-2 text-[10px] text-text-dim flex flex-wrap gap-3">
                                        <span>Provider: <strong className="text-accent">{item.provider ?? '—'}</strong></span>
                                        <span>Exit: <strong className="text-accent">{item.exitCode ?? '—'}</strong></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bento-card space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Insights proativos</span>
                        <ShieldCheck className="size-4 text-primary" />
                    </div>
                    {proactiveLoading ? (
                        <div className="space-y-2">
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    ) : !proactiveData ? (
                        <p className="text-xs text-text-dim">Nenhum insight proativo disponível.</p>
                    ) : (
                        <>
                            <div className="rounded-xl border border-border bg-bg p-3 text-[11px] text-text-dim grid grid-cols-1 md:grid-cols-2 gap-2">
                                <p>Provider: <strong className="text-accent">{proactiveData.provider}</strong></p>
                                <p>Eventos de entrada: <strong className="text-accent">{proactiveData.inputEvents}</strong></p>
                                <p>Gerado em: <strong className="text-accent">{formatDate(proactiveData.generatedAt)}</strong></p>
                                <p>Comando: <strong className="text-accent font-mono">{proactiveData.command}</strong></p>
                            </div>
                            <div className="space-y-2">
                                {(proactiveData.plan.recommendations ?? []).slice(0, 4).map((item, idx) => (
                                    <div key={`${item.title}-${idx}`} className="rounded-xl border border-border bg-bg p-3">
                                        <p className="text-xs font-bold text-accent">{item.title}</p>
                                        <p className="text-xs text-text-dim mt-1">{item.rationale}</p>
                                        <p className="text-[10px] text-primary mt-2 uppercase tracking-wider font-bold">{item.action}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="bento-card space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="label-caps">Recall reranqueado</span>
                        <Search className="size-4 text-primary" />
                    </div>

                    <form onSubmit={handleRecall} className="space-y-2">
                        <input
                            value={recallQuery}
                            onChange={(event) => setRecallQuery(event.target.value)}
                            placeholder="Buscar contexto semântico..."
                            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-accent placeholder:text-text-dim focus:outline-none focus:border-primary"
                        />
                        <button
                            type="submit"
                            disabled={recallBusy}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors',
                                recallBusy && 'opacity-60 cursor-not-allowed',
                            )}
                        >
                            <Brain className="size-3.5" />
                            Executar rerank
                        </button>
                    </form>

                    {recallBusy ? (
                        <div className="space-y-2">
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    ) : !recallData ? (
                        <p className="text-xs text-text-dim">Envie uma consulta para visualizar contexto reranqueado.</p>
                    ) : (
                        <>
                            <div className="rounded-xl border border-border bg-bg p-3 text-[11px] text-text-dim grid grid-cols-2 gap-2">
                                <p>Query: <strong className="text-accent">{recallData.query}</strong></p>
                                <p>Tokens: <strong className="text-accent">{recallData.tokenEstimate}</strong></p>
                            </div>
                            <div className="space-y-2 max-h-72 overflow-auto pr-1">
                                {recallData.items.map((item) => (
                                    <div key={`${item.rank}-${item.key}`} className="rounded-xl border border-border bg-bg p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-xs font-bold text-accent">#{item.rank} · {item.key}</p>
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{item.category}</span>
                                        </div>
                                        <p className="text-xs text-text-dim mt-1 line-clamp-3">{item.value}</p>
                                        <div className="mt-2 text-[10px] text-text-dim flex flex-wrap gap-3">
                                            <span>Score: <strong className="text-accent">{item.score.toFixed(2)}</strong></span>
                                            <span>Motivo: <strong className="text-accent">{item.reason ?? 'n/a'}</strong></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="bento-card border-primary/20 bg-primary/5">
                <div className="flex items-start gap-3">
                    <Layers className="size-5 text-primary mt-0.5" />
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-primary">Proveniência visível</p>
                        <p className="text-xs text-text-dim mt-1">
                            Este painel mostra provider, comando e exit code para jobs, summaries e insights, permitindo auditoria rápida de inferências por origem.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
