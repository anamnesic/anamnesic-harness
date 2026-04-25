'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Trash2, Bot } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

type AgentState = 'idle' | 'running' | 'paused' | 'error' | 'stopped';
type AgentCapability = 'code-generation' | 'code-analysis' | 'security-analysis' | 'reasoning' | 'execution' | 'learning';

interface Agent {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    version: string;
    capabilities: AgentCapability[];
    state: AgentState;
    isActive: boolean;
    tasksCompleted: number;
    tasksFailed: number;
    lastActivityAt: string | null;
    createdAt: string;
}

interface ApiResponse {
    success: boolean;
    data: Agent[];
}

const ALL_CAPABILITIES: AgentCapability[] = [
    'code-generation',
    'code-analysis',
    'security-analysis',
    'reasoning',
    'execution',
    'learning',
];

const STATE_STYLES: Record<AgentState, string> = {
    idle: 'bg-green-500/15 text-green-400',
    running: 'bg-primary/15 text-primary',
    paused: 'bg-yellow-500/15 text-yellow-400',
    error: 'bg-red-500/15 text-red-400',
    stopped: 'bg-zinc-500/15 text-zinc-400',
};

const STATE_DOT: Record<AgentState, string> = {
    idle: 'bg-green-400',
    running: 'bg-primary',
    paused: 'bg-yellow-400',
    error: 'bg-red-400',
    stopped: 'bg-zinc-400',
};

function StateBadge({
    state,
    agentId,
    onStateChange,
}: {
    state: AgentState;
    agentId: string;
    onStateChange: (id: string, state: AgentState) => void;
}) {
    const [open, setOpen] = useState(false);
    const states: AgentState[] = ['idle', 'running', 'paused', 'error', 'stopped'];

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={cn(
                    'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-opacity hover:opacity-80',
                    STATE_STYLES[state]
                )}
            >
                <span className={cn('size-1.5 rounded-full', STATE_DOT[state])} />
                {state}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute left-0 top-full z-20 mt-1 min-w-[110px] rounded-xl border border-border bg-card shadow-lg overflow-hidden"
                    >
                        {states.map(s => (
                            <button
                                key={s}
                                onClick={() => { setOpen(false); onStateChange(agentId, s); }}
                                className={cn(
                                    'flex w-full items-center gap-2 px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/5',
                                    s === state ? 'opacity-50 cursor-default' : ''
                                )}
                            >
                                <span className={cn('size-1.5 rounded-full', STATE_DOT[s])} />
                                {s}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function Agents() {
    const { data, loading, refetch } = useApi<ApiResponse>('/api/v1/agents');
    const { toast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [workspaceId, setWorkspaceId] = useState('system');
    const [capabilities, setCapabilities] = useState<AgentCapability[]>(['reasoning']);
    const [submitting, setSubmitting] = useState(false);

    const agents: Agent[] = (data as any)?.data ?? data ?? [];

    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.state === 'running' || a.state === 'idle').length;
    const totalCompleted = agents.reduce((sum, a) => sum + (a.tasksCompleted ?? 0), 0);
    const totalFailed = agents.reduce((sum, a) => sum + (a.tasksFailed ?? 0), 0);

    function closeModal() {
        setShowModal(false);
        setName('');
        setDescription('');
        setWorkspaceId('system');
        setCapabilities(['reasoning']);
    }

    function toggleCapability(cap: AgentCapability) {
        setCapabilities(prev =>
            prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
        );
    }

    async function handleSubmit() {
        if (!name.trim()) { toast('Name is required', 'error'); return; }
        if (capabilities.length === 0) { toast('Select at least one capability', 'error'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/v1/agents', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    workspaceId: workspaceId.trim() || 'system',
                    capabilities,
                }),
            });
            toast('Agent created', 'success');
            refetch();
            closeModal();
        } catch (e: any) {
            toast(e.message ?? 'Failed to create agent', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string, agentName: string) {
        try {
            await apiFetch(`/api/v1/agents/${id}`, { method: 'DELETE' });
            toast(`Agent "${agentName}" deleted`, 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Failed to delete agent', 'error');
        }
    }

    async function handleStateChange(id: string, state: AgentState) {
        try {
            await apiFetch(`/api/v1/agents/${id}/state`, {
                method: 'PATCH',
                body: JSON.stringify({ state }),
            });
            toast(`State set to ${state}`, 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Failed to update state', 'error');
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full"
        >
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Agents</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                >
                    <Plus className="size-3.5" />
                    New Agent
                </button>
            </div>

            {/* Stats row */}
            <div className="mb-6 grid grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: totalAgents },
                    { label: 'Active', value: activeAgents },
                    { label: 'Completed', value: totalCompleted },
                    { label: 'Failed', value: totalFailed },
                ].map(stat => (
                    <div key={stat.label} className="bento-card text-center">
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="label-caps text-text-dim mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Agent list */}
            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <Bot className="size-10 text-border" />
                    <p className="text-text-dim text-sm">No agents configured</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {agents.map(agent => (
                        <div key={agent.id} className="bento-card space-y-3">
                            {/* Top row */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-accent truncate">{agent.name}</span>
                                    <span className="text-xs text-text-dim font-mono shrink-0">v{agent.version}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <StateBadge
                                        state={agent.state}
                                        agentId={agent.id}
                                        onStateChange={handleStateChange}
                                    />
                                    <button
                                        onClick={() => handleDelete(agent.id, agent.name)}
                                        className="rounded-lg p-1 text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        aria-label="Delete agent"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            {agent.description && (
                                <p className="text-sm text-text-dim leading-relaxed">{agent.description}</p>
                            )}

                            {/* Capabilities */}
                            {agent.capabilities?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {agent.capabilities.map(cap => (
                                        <span
                                            key={cap}
                                            className="rounded-md bg-white/5 border border-border px-2 py-0.5 text-[10px] font-semibold text-text-dim uppercase tracking-wider"
                                        >
                                            {cap}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Stats footer */}
                            <div className="flex items-center gap-4 pt-1 border-t border-border/40 text-xs text-text-dim">
                                <span>
                                    <span className="text-green-400 font-semibold">{agent.tasksCompleted ?? 0}</span> completed
                                </span>
                                <span>
                                    <span className="text-red-400 font-semibold">{agent.tasksFailed ?? 0}</span> failed
                                </span>
                                <span className="ml-auto label-caps">{agent.workspaceId}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Agent Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
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
                            className="bento-card w-full max-w-md space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-base">New Agent</h3>
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
                                        placeholder="Agent name"
                                    />
                                </div>

                                <div>
                                    <label className="label-caps block mb-1">Description</label>
                                    <textarea
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors resize-none"
                                        rows={2}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Optional description"
                                    />
                                </div>

                                <div>
                                    <label className="label-caps block mb-1">Workspace ID</label>
                                    <input
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors font-mono"
                                        value={workspaceId}
                                        onChange={e => setWorkspaceId(e.target.value)}
                                        placeholder="system"
                                    />
                                </div>

                                <div>
                                    <label className="label-caps block mb-2">Capabilities</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {ALL_CAPABILITIES.map(cap => (
                                            <label key={cap} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={capabilities.includes(cap)}
                                                    onChange={() => toggleCapability(cap)}
                                                    className="rounded accent-primary"
                                                />
                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">{cap}</span>
                                            </label>
                                        ))}
                                    </div>
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
                                    {submitting ? 'Creating...' : 'Create Agent'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
