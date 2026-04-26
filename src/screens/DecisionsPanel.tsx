'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Plus, Pencil, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { cn } from '@/src/lib/utils';

interface Decision {
    id: string;
    title: string;
    description: string;
    status: string;
    rationale?: Record<string, any> | null;
    alternatives?: Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    timestamp: string;
}

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-500/15 text-green-400',
    deprecated: 'bg-zinc-500/15 text-zinc-400',
    superseded: 'bg-stone-50/10 text-stone-200',
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
            STATUS_STYLES[status] ?? STATUS_STYLES.deprecated
        )}>
            {status}
        </span>
    );
}

function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

function parseJsonOrText(value: string): Record<string, any> | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') return parsed;
        return { value: parsed };
    } catch {
        return { text: trimmed };
    }
}

function jsonToTextarea(value: Record<string, any> | null | undefined): string {
    if (!value) return '';
    if (typeof value === 'object' && Object.keys(value).length === 1 && typeof value.text === 'string') {
        return value.text;
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return '';
    }
}

interface DecisionRowProps {
    decision: Decision;
    onEdit: (d: Decision) => void;
    onDelete: (d: Decision) => void;
}

function DecisionRow({ decision, onEdit, onDelete }: DecisionRowProps) {
    const [descExpanded, setDescExpanded] = useState(false);
    const [showRationale, setShowRationale] = useState(false);
    const [showAlternatives, setShowAlternatives] = useState(false);

    const hasRationale = !!decision.rationale && Object.keys(decision.rationale).length > 0;
    const hasAlternatives = !!decision.alternatives && Object.keys(decision.alternatives).length > 0;

    return (
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-text truncate">{decision.title}</span>
                    <StatusBadge status={decision.status} />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onEdit(decision)}
                        className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors"
                        aria-label="Edit decision"
                    >
                        <Pencil className="size-3.5" />
                    </button>
                    <button
                        onClick={() => onDelete(decision)}
                        className="rounded-lg p-1.5 text-text-dim hover:text-red-400 transition-colors"
                        aria-label="Delete decision"
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            </div>

            {decision.description && (
                <p
                    onClick={() => setDescExpanded(v => !v)}
                    className={cn(
                        'text-sm text-text-dim leading-relaxed cursor-pointer',
                        !descExpanded && 'line-clamp-2'
                    )}
                    title={descExpanded ? 'Click to collapse' : 'Click to expand'}
                >
                    {decision.description}
                </p>
            )}

            {hasRationale && (
                <div className="border-t border-border/60 pt-2">
                    <button
                        onClick={() => setShowRationale(v => !v)}
                        className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
                    >
                        {showRationale ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                        Rationale
                    </button>
                    {showRationale && (
                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-bg/60 p-3 text-xs font-mono text-text-dim whitespace-pre-wrap wrap-break-word">
                            {JSON.stringify(decision.rationale, null, 2)}
                        </pre>
                    )}
                </div>
            )}

            {hasAlternatives && (
                <div className="border-t border-border/60 pt-2">
                    <button
                        onClick={() => setShowAlternatives(v => !v)}
                        className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-text-dim hover:text-accent transition-colors"
                    >
                        {showAlternatives ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                        Alternatives
                    </button>
                    {showAlternatives && (
                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-bg/60 p-3 text-xs font-mono text-text-dim whitespace-pre-wrap wrap-break-word">
                            {JSON.stringify(decision.alternatives, null, 2)}
                        </pre>
                    )}
                </div>
            )}

            <p className="label-caps text-text-dim">{relativeTime(decision.createdAt)}</p>
        </div>
    );
}

interface DecisionModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: {
        title: string;
        description: string;
        status: string;
        rationale: Record<string, any> | null;
        alternatives: Record<string, any> | null;
    }) => Promise<void>;
    initial?: Decision | null;
}

function DecisionModal({ open, onClose, onSubmit, initial }: DecisionModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('active');
    const [rationaleText, setRationaleText] = useState('');
    const [alternativesText, setAlternativesText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTitle(initial?.title ?? '');
        setDescription(initial?.description ?? '');
        setStatus(initial?.status ?? 'active');
        setRationaleText(jsonToTextarea(initial?.rationale));
        setAlternativesText(jsonToTextarea(initial?.alternatives));
        setSubmitting(false);
    }, [open, initial]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;
        setSubmitting(true);
        try {
            await onSubmit({
                title: title.trim(),
                description: description.trim(),
                status,
                rationale: parseJsonOrText(rationaleText),
                alternatives: parseJsonOrText(alternativesText),
            });
        } finally {
            setSubmitting(false);
        }
    }

    if (!open) return null;

    return (
        <motion.div
            key="decision-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.form
                key="decision-modal"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                onSubmit={handleSubmit}
                className="bento-card w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{initial ? 'Edit Decision' : 'New Decision'}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="space-y-1">
                    <label className="label-caps text-text-dim">Title</label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
                    />
                </div>

                <div className="space-y-1">
                    <label className="label-caps text-text-dim">Description</label>
                    <textarea
                        required
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-y"
                    />
                </div>

                <div className="space-y-1">
                    <label className="label-caps text-text-dim">Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm focus:outline-none focus:border-primary/60"
                    >
                        <option value="active">active</option>
                        <option value="deprecated">deprecated</option>
                        <option value="superseded">superseded</option>
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="label-caps text-text-dim">Rationale (JSON or text)</label>
                    <textarea
                        rows={4}
                        value={rationaleText}
                        onChange={(e) => setRationaleText(e.target.value)}
                        placeholder='{"reason": "..."} or plain text'
                        className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary/60 resize-y"
                    />
                </div>

                <div className="space-y-1">
                    <label className="label-caps text-text-dim">Alternatives (JSON or text)</label>
                    <textarea
                        rows={4}
                        value={alternativesText}
                        onChange={(e) => setAlternativesText(e.target.value)}
                        placeholder='{"considered": ["A", "B"]} or plain text'
                        className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary/60 resize-y"
                    />
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-lg border border-border px-4 py-2 text-xs font-bold text-text-dim hover:text-text transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 rounded-lg bg-primary/20 border border-primary/40 px-4 py-2 text-xs font-bold text-accent hover:bg-primary/30 transition-colors disabled:opacity-50"
                        style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)' }}
                    >
                        {submitting ? 'Saving…' : initial ? 'Save' : 'Create'}
                    </button>
                </div>
            </motion.form>
        </motion.div>
    );
}

export function DecisionsPanel({ projectId }: { projectId: string }) {
    const { toast } = useToast();
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [loadingDecisions, setLoadingDecisions] = useState(true);
    const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
    const [showDecisionModal, setShowDecisionModal] = useState(false);

    const fetchDecisions = useCallback(async () => {
        setLoadingDecisions(true);
        try {
            const res = await apiFetch<ApiResponse<Decision[]>>(`/api/v1/projects/${projectId}/decisions`);
            setDecisions(res.data ?? []);
        } catch (e: any) {
            toast(e?.message ?? 'Falha ao carregar decisões', 'error');
        } finally {
            setLoadingDecisions(false);
        }
    }, [projectId, toast]);

    useEffect(() => {
        fetchDecisions();
    }, [fetchDecisions]);

    function openCreate() {
        setEditingDecision(null);
        setShowDecisionModal(true);
    }

    function openEdit(d: Decision) {
        setEditingDecision(d);
        setShowDecisionModal(true);
    }

    async function handleSubmit(payload: {
        title: string;
        description: string;
        status: string;
        rationale: Record<string, any> | null;
        alternatives: Record<string, any> | null;
    }) {
        try {
            if (editingDecision) {
                await apiFetch(`/api/v1/projects/${projectId}/decisions/${editingDecision.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                });
                toast('Decisão atualizada', 'success');
            } else {
                await apiFetch(`/api/v1/projects/${projectId}/decisions`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                toast('Decisão criada', 'success');
            }
            setShowDecisionModal(false);
            setEditingDecision(null);
            await fetchDecisions();
        } catch (e: any) {
            toast(e?.message ?? 'Falha ao salvar decisão', 'error');
        }
    }

    async function handleDelete(d: Decision) {
        if (!window.confirm(`Excluir decisão "${d.title}"?`)) return;
        try {
            await apiFetch(`/api/v1/projects/${projectId}/decisions/${d.id}`, { method: 'DELETE' });
            toast('Decisão excluída', 'success');
            await fetchDecisions();
        } catch (e: any) {
            toast(e?.message ?? 'Falha ao excluir decisão', 'error');
        }
    }

    return (
        <div className="bento-card mt-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Lightbulb className="size-4 text-primary" />
                    <h3 className="font-bold text-accent">Decisões</h3>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                >
                    <Plus className="size-3.5" />
                    Adicionar decisão
                </button>
            </div>

            {loadingDecisions ? (
                <p className="text-sm text-text-dim">Carregando decisões…</p>
            ) : decisions.length === 0 ? (
                <p className="text-sm text-text-dim italic">Nenhuma decisão registrada para este projeto ainda.</p>
            ) : (
                <div className="space-y-3">
                    {decisions.map(d => (
                        <DecisionRow
                            key={d.id}
                            decision={d}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showDecisionModal && (
                    <DecisionModal
                        open={showDecisionModal}
                        onClose={() => { setShowDecisionModal(false); setEditingDecision(null); }}
                        onSubmit={handleSubmit}
                        initial={editingDecision}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
