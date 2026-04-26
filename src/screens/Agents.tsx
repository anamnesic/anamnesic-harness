'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Trash2, Bot, ListTodo, Play, Pencil } from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { usePolling } from '@/src/lib/usePolling';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { useWorkspace } from '@/src/context/WorkspaceContext';

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
    metadata?: Record<string, any> | null;
}

interface ApiResponse {
    success: boolean;
    data: Agent[];
}

interface PromptCapabilityItem {
    key: string;
    title: string;
    description: string;
    prompt: string;
    isCustom?: boolean;
}

const ALL_CAPABILITIES: AgentCapability[] = [
    'code-generation',
    'code-analysis',
    'security-analysis',
    'reasoning',
    'execution',
    'learning',
];

const CAPABILITY_INFO: Record<AgentCapability, { title: string; description: string }> = {
    'code-generation': {
        title: 'Code Generation',
        description: 'Gera implementacoes de codigo com base em objetivo, contexto e restricoes.',
    },
    'code-analysis': {
        title: 'Code Analysis',
        description: 'Analisa base de codigo, identifica riscos, melhoria e inconsistencias.',
    },
    'security-analysis': {
        title: 'Security Analysis',
        description: 'Avalia vulnerabilidades, exposicoes e padroes inseguros.',
    },
    reasoning: {
        title: 'Reasoning',
        description: 'Quebra problemas em etapas e toma decisoes com justificativa estruturada.',
    },
    execution: {
        title: 'Execution',
        description: 'Executa acoes praticas, automacoes e tarefas orientadas a resultado.',
    },
    learning: {
        title: 'Learning',
        description: 'Adapta comportamento conforme contexto e historico de uso.',
    },
};

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
                        className="absolute left-0 top-full z-20 mt-1 min-w-27.5 rounded-xl border border-border bg-card shadow-lg overflow-hidden"
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

interface AgentsProps {
    onNavigate?: (tab: 'tasks') => void;
}

export function Agents({ onNavigate }: AgentsProps) {
    const { data, loading, refetch } = usePolling<ApiResponse>('/api/v1/agents', 20000);
    const { toast } = useToast();
    const { workspace } = useWorkspace();

    const [showModal, setShowModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [capabilities, setCapacidades] = useState<AgentCapability[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [savingPromptKey, setSavingPromptKey] = useState<string | null>(null);
    const [addingCapability, setAddingCapability] = useState(false);
    const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
    const [newCapabilityKey, setNewCapabilityKey] = useState('');
    const [newCapabilityTitle, setNewCapabilityTitle] = useState('');
    const [newCapabilityDescription, setNewCapabilityDescription] = useState('');
    const [newCapabilityPrompt, setNewCapabilityPrompt] = useState('');

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [activeView, setActiveView] = useState<'agents' | 'skills'>('agents');
    const [taskAgent, setTaskAgent] = useState<Agent | null>(null);
    const [taskDescription, setTaskDescription] = useState('');
    const [taskInput, setTaskInput] = useState('{\n  "query": ""\n}');
    const [taskType, setTaskType] = useState('research');

    const agents: Agent[] = (data as any)?.data ?? data ?? [];

    const sortedAgents = useMemo(() => {
        return [...agents].sort((a, b) => {
            const aPrebuilt = Boolean(a.metadata?.prebuilt);
            const bPrebuilt = Boolean(b.metadata?.prebuilt);
            if (aPrebuilt !== bPrebuilt) return aPrebuilt ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    }, [agents]);

    const totalAgents = sortedAgents.length;
    const activeAgents = sortedAgents.filter(a => a.isActive).length;
    const totalCompleted = sortedAgents.reduce((sum, a) => sum + (a.tasksCompleted ?? 0), 0);
    const totalFailed = sortedAgents.reduce((sum, a) => sum + (a.tasksFailed ?? 0), 0);
    const promptEngineerAgent = sortedAgents.find(
        (agent) => agent.name === 'Prompt Engineer' || agent.metadata?.role === 'prompt-engineer'
    );

    const promptCapabilities = useMemo<PromptCapabilityItem[]>(() => {
        const metadata = (promptEngineerAgent?.metadata as Record<string, any> | null) ?? null;
        const templates = (metadata?.promptTemplates as Record<string, string> | undefined) ?? {};
        const customCapabilities = (metadata?.customPromptCapabilities as PromptCapabilityItem[] | undefined) ?? [];

        const base = ALL_CAPABILITIES.map((capability) => ({
            key: capability,
            title: CAPABILITY_INFO[capability].title,
            description: CAPABILITY_INFO[capability].description,
            prompt: templates[capability] ?? '',
            isCustom: false,
        }));

        const custom = customCapabilities.map((item) => ({
            key: item.key,
            title: item.title,
            description: item.description,
            prompt: templates[item.key] ?? item.prompt ?? '',
            isCustom: true,
        }));

        return [...base, ...custom];
    }, [promptEngineerAgent]);

    useEffect(() => {
        setPromptDrafts((prev) => {
            const next = { ...prev };
            let changed = false;
            for (const capability of promptCapabilities) {
                if (next[capability.key] === undefined) {
                    next[capability.key] = capability.prompt ?? '';
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [promptCapabilities]);

    function closeModal() {
        setShowModal(false);
        setEditingAgent(null);
        setName('');
        setDescription('');
        setCapacidades(['reasoning']);
    }

    function openEditModal(agent: Agent) {
        setEditingAgent(agent);
        setName(agent.name);
        setDescription(agent.description ?? '');
        setCapacidades((agent.capabilities?.length ? agent.capabilities : ['reasoning']) as AgentCapability[]);
        setShowModal(true);
    }

    function closeTaskModal() {
        setShowTaskModal(false);
        setTaskAgent(null);
        setTaskDescription('');
    }

    function toggleCapability(cap: AgentCapability) {
        setCapacidades(prev =>
            prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
        );
    }

    async function handleSubmit() {
        if (!name.trim()) { toast('Nome é obrigatório', 'error'); return; }
        if (capabilities.length === 0) { toast('Selecione ao menos uma capacidade', 'error'); return; }
        if (!editingAgent && !workspace) { toast('Nenhum workspace ativo', 'error'); return; }

        setSubmitting(true);
        try {
            if (editingAgent) {
                await apiFetch(`/api/v1/agents/${editingAgent.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: name.trim(),
                        description: description.trim() || undefined,
                        capabilities,
                    }),
                });
                toast('Agente atualizado', 'success');
            } else {
                await apiFetch('/api/v1/agents', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: name.trim(),
                        description: description.trim() || undefined,
                        workspaceId: workspace!.id,
                        capabilities,
                    }),
                });
                toast('Agente criado', 'success');
            }
            refetch();
            closeModal();
        } catch (e: any) {
            toast(e.message ?? `Falha ao ${editingAgent ? 'atualizar' : 'criar'} agente`, 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAssignTask() {
        if (!taskAgent || !taskDescription.trim()) { toast('Descrição é obrigatória', 'error'); return; }
        if (!workspace) { toast('Nenhum workspace ativo', 'error'); return; }

        setSubmitting(true);
        try {
            let input = {};
            try {
                input = JSON.parse(taskInput);
            } catch (e) {
                toast('JSON de entrada inválido', 'error');
                setSubmitting(false);
                return;
            }

            await apiFetch('/api/v1/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    workspaceId: workspace.id,
                    agentId: taskAgent.id,
                    type: taskType,
                    description: taskDescription.trim(),
                    input,
                }),
            });
            toast('Tarefa atribuída ao agente', 'success');
            closeTaskModal();
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao atribuir tarefa', 'error');
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
            toast(e.message ?? 'Falha ao excluir agente', 'error');
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
            toast(e.message ?? 'Falha ao atualizar estado', 'error');
        }
    }

    async function handleToggleActive(agent: Agent) {
        try {
            await apiFetch(`/api/v1/agents/${agent.id}`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: !agent.isActive }),
            });
            toast(`Agente ${!agent.isActive ? 'ativado' : 'desativado'}`, 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao atualizar status do agente', 'error');
        }
    }

    async function handleSaveCapabilityPrompt(capability: PromptCapabilityItem) {
        if (!promptEngineerAgent) {
            toast('Agente Prompt Engineer não encontrado', 'error');
            return;
        }

        const metadata = (promptEngineerAgent.metadata as Record<string, any> | null) ?? {};
        const promptTemplates = {
            ...((metadata.promptTemplates as Record<string, string> | undefined) ?? {}),
            [capability.key]: promptDrafts[capability.key] ?? '',
        };

        const customPromptCapabilities: PromptCapabilityItem[] = [
            ...(((metadata.customPromptCapabilities as PromptCapabilityItem[] | undefined) ?? []).map((item) => (
                item.key === capability.key
                    ? { ...item, prompt: promptDrafts[capability.key] ?? '' }
                    : item
            ))),
        ];

        setSavingPromptKey(capability.key);
        try {
            await apiFetch(`/api/v1/agents/${promptEngineerAgent.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    metadata: {
                        ...metadata,
                        promptTemplates,
                        customPromptCapabilities,
                    },
                }),
            });
            toast('Prompt atualizado', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao salvar prompt', 'error');
        } finally {
            setSavingPromptKey(null);
        }
    }

    async function handleAddPromptCapability() {
        if (!promptEngineerAgent) {
            toast('Agente Prompt Engineer não encontrado', 'error');
            return;
        }

        const key = newCapabilityKey.trim().toLowerCase().replace(/\s+/g, '-');
        if (!key) { toast('Chave da capacidade é obrigatória', 'error'); return; }
        if (!newCapabilityTitle.trim()) { toast('Título é obrigatório', 'error'); return; }
        if (!newCapabilityPrompt.trim()) { toast('Prompt é obrigatório', 'error'); return; }
        if (promptCapabilities.some((item) => item.key === key)) {
            toast('Já existe capacidade com essa chave', 'error');
            return;
        }

        const metadata = (promptEngineerAgent.metadata as Record<string, any> | null) ?? {};
        const customPromptCapabilities = [
            ...((metadata.customPromptCapabilities as PromptCapabilityItem[] | undefined) ?? []),
            {
                key,
                title: newCapabilityTitle.trim(),
                description: newCapabilityDescription.trim(),
                prompt: newCapabilityPrompt,
                isCustom: true,
            },
        ];

        const promptTemplates = {
            ...((metadata.promptTemplates as Record<string, string> | undefined) ?? {}),
            [key]: newCapabilityPrompt,
        };

        setAddingCapability(true);
        try {
            await apiFetch(`/api/v1/agents/${promptEngineerAgent.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    metadata: {
                        ...metadata,
                        customPromptCapabilities,
                        promptTemplates,
                    },
                }),
            });
            toast('Nova capacidade adicionada', 'success');
            setNewCapabilityKey('');
            setNewCapabilityTitle('');
            setNewCapabilityDescription('');
            setNewCapabilityPrompt('');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao adicionar capacidade', 'error');
        } finally {
            setAddingCapability(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 w-full max-w-7xl mx-auto p-6 pb-32"
        >
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold tracking-tight">Agents</h2>
                    <button
                        onClick={() => onNavigate?.('tasks')}
                        className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                        <ListTodo className="size-3.5" />
                        View Tasks
                    </button>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-primary/60 transition-colors"
                >
                    <Plus className="size-3.5" />
                    Novo agente
                </button>
            </div>

            <div className="mb-6 inline-flex rounded-xl border border-border bg-card/50 p-1">
                <button
                    onClick={() => setActiveView('agents')}
                    className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                        activeView === 'agents'
                            ? 'bg-bg text-highlight border border-border'
                            : 'text-text-dim hover:text-accent'
                    )}
                >
                    Agentes
                </button>
                <button
                    onClick={() => setActiveView('skills')}
                    className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                        activeView === 'skills'
                            ? 'bg-bg text-highlight border border-border'
                            : 'text-text-dim hover:text-accent'
                    )}
                >
                    Skills
                </button>
            </div>

            {activeView === 'agents' ? (
                <>
                    {/* Stats row */}
                    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[
                            { label: 'Total', value: totalAgents },
                            { label: 'Ativo', value: activeAgents },
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
                            <p className="text-text-dim text-sm">Nenhum agente configurado</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                            {sortedAgents.map(agent => {
                                const isPrebuilt = Boolean(agent.metadata?.prebuilt);
                                return (
                                    <div key={agent.id} className="bento-card flex h-full flex-col gap-3">
                                        {/* Top row */}
                                        <div className="space-y-2">
                                            <h3 className="wrap-break-word text-base font-bold leading-tight text-accent">
                                                {agent.name}
                                            </h3>

                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs text-text-dim font-mono">v{agent.version}</span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => openEditModal(agent)}
                                                        className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-dim hover:text-accent hover:border-accent/40 transition-colors"
                                                        aria-label="Editar agente"
                                                    >
                                                        <span className="flex items-center gap-1">
                                                            <Pencil className="size-3" />
                                                            Editar
                                                        </span>
                                                    </button>
                                                    <StateBadge
                                                        state={agent.state}
                                                        agentId={agent.id}
                                                        onStateChange={handleStateChange}
                                                    />
                                                    {isPrebuilt ? (
                                                        <button
                                                            onClick={() => void handleToggleActive(agent)}
                                                            className={cn(
                                                                'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors',
                                                                agent.isActive
                                                                    ? 'border-green-500/40 bg-green-500/15 text-green-400'
                                                                    : 'border-zinc-500/40 bg-zinc-500/15 text-zinc-400'
                                                            )}
                                                            aria-label={agent.isActive ? 'Desativar agente' : 'Ativar agente'}
                                                        >
                                                            {agent.isActive ? 'Ativo' : 'Inativo'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDelete(agent.id, agent.name)}
                                                            className="rounded-lg p-1 text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                            aria-label="Delete agent"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {agent.description && (
                                            <p className="text-sm text-text-dim leading-relaxed">{agent.description}</p>
                                        )}

                                        {/* Capacidades */}
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
                                        <div className="mt-auto flex items-center gap-4 border-t border-border/40 pt-1 text-xs text-text-dim">
                                            <span>
                                                <span className="text-green-400 font-semibold">{agent.tasksCompleted ?? 0}</span> completed
                                            </span>
                                            <span>
                                                <span className="text-red-400 font-semibold">{agent.tasksFailed ?? 0}</span> failed
                                            </span>
                                            <button
                                                onClick={() => { setTaskAgent(agent); setShowTaskModal(true); }}
                                                className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
                                            >
                                                <Play className="size-2.5" />
                                                Atribuir tarefa
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    <div className="bento-card space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-accent">Nova capacidade</h3>
                            <span className="label-caps mb-0!">Skills</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <input
                                value={newCapabilityKey}
                                onChange={(e) => setNewCapabilityKey(e.target.value)}
                                placeholder="Chave (ex.: critical-thinking)"
                                className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                            />
                            <input
                                value={newCapabilityTitle}
                                onChange={(e) => setNewCapabilityTitle(e.target.value)}
                                placeholder="Título"
                                className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                            />
                        </div>

                        <input
                            value={newCapabilityDescription}
                            onChange={(e) => setNewCapabilityDescription(e.target.value)}
                            placeholder="Descrição da capacidade"
                            className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                        />

                        <textarea
                            value={newCapabilityPrompt}
                            onChange={(e) => setNewCapabilityPrompt(e.target.value)}
                            placeholder="Prompt base da nova capacidade"
                            rows={4}
                            className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none resize-none focus:border-primary/60 transition-colors"
                        />

                        <div className="flex justify-end">
                            <button
                                onClick={() => void handleAddPromptCapability()}
                                disabled={addingCapability}
                                className="rounded-xl bg-primary/90 hover:bg-primary px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
                            >
                                {addingCapability ? 'Adicionando...' : 'Adicionar capacidade'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {promptCapabilities.map((capability) => (
                            <div key={capability.key} className="bento-card space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="text-base font-bold text-accent">{capability.title}</h3>
                                    <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                                        {capability.key}
                                    </span>
                                </div>

                                <p className="text-sm leading-relaxed text-text-dim">{capability.description}</p>

                                <textarea
                                    value={promptDrafts[capability.key] ?? ''}
                                    onChange={(e) => setPromptDrafts((prev) => ({ ...prev, [capability.key]: e.target.value }))}
                                    rows={5}
                                    className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none resize-none focus:border-primary/60 transition-colors"
                                />

                                <div className="flex justify-end">
                                    <button
                                        onClick={() => void handleSaveCapabilityPrompt(capability)}
                                        disabled={savingPromptKey === capability.key}
                                        className="rounded-xl bg-primary/90 hover:bg-primary px-3 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
                                    >
                                        {savingPromptKey === capability.key ? 'Salvando...' : 'Salvar prompt'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Task Assignment Modal */}
            <AnimatePresence>
                {showTaskModal && taskAgent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={e => { if (e.target === e.currentTarget) closeTaskModal(); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            transition={{ duration: 0.15 }}
                            className="bento-card w-full max-w-md space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-base">Atribuir tarefa</h3>
                                    <p className="text-[10px] text-text-dim uppercase tracking-widest font-bold">To: {taskAgent.name}</p>
                                </div>
                                <button onClick={closeTaskModal} className="rounded-lg p-1 text-text-dim hover:text-accent transition-colors">
                                    <X className="size-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="label-caps block mb-1">Type</label>
                                    <select
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={taskType}
                                        onChange={e => setTaskType(e.target.value)}
                                    >
                                        <option value="research">Pesquisa</option>
                                        <option value="code">Código</option>
                                        <option value="analysis">Análise</option>
                                        <option value="execution">Execução</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="label-caps block mb-1">Description</label>
                                    <input
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none focus:border-primary/60 transition-colors"
                                        value={taskDescription}
                                        onChange={e => setTaskDescription(e.target.value)}
                                        placeholder="O que o agente deve fazer?"
                                    />
                                </div>

                                <div>
                                    <label className="label-caps block mb-1">JSON de entrada</label>
                                    <textarea
                                        className="w-full rounded-xl border border-border bg-white/5 px-3 py-2 text-sm font-mono outline-none focus:border-primary/60 transition-colors resize-none"
                                        rows={4}
                                        value={taskInput}
                                        onChange={e => setTaskInput(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    onClick={closeTaskModal}
                                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text-dim hover:border-border/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssignTask}
                                    disabled={submitting}
                                    className="rounded-xl bg-primary/90 hover:bg-primary px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Assigning...' : 'Atribuir tarefa'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Novo agente Modal */}
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
                                <h3 className="font-bold text-base">{editingAgent ? 'Editar agente' : 'Novo agente'}</h3>
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
                                        placeholder="Nome do agente"
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
                                    <label className="label-caps block mb-2">Capacidades</label>
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
                                    {submitting ? (editingAgent ? 'Salvando...' : 'Criando...') : (editingAgent ? 'Salvar' : 'Criar agente')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
