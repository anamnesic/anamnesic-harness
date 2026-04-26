'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from 'lucide-react';
import { usePolling } from '@/src/lib/usePolling';
import { SkeletonCard } from '@/src/components/Skeleton';
import { AgentManagementScreen } from './AgentManagementScreen';
import {
    INTERNAL_AGENT_SKILLS,
    INTERNAL_SKILL_INFO,
    DEFAULT_INTERNAL_SKILL_PROMPTS,
    type InternalAgentSkill,
} from '@/src/core/agents/internalSkillPrompts';

interface Agent {
    id: string;
    name: string;
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
}

export function AgentSkillsScreen() {
    const [open, setOpen] = useState(false);
    const { data, loading } = usePolling<ApiResponse>('/api/v1/agents', 20000);

    const agents: Agent[] = (data as any)?.data ?? data ?? [];
    const promptEngineerAgent = agents.find(
        (agent) => agent.name === 'Prompt Engineer' || agent.metadata?.role === 'prompt-engineer',
    );

    const promptCapabilities = useMemo<PromptCapabilityItem[]>(() => {
        const metadata = (promptEngineerAgent?.metadata as Record<string, any> | null) ?? null;
        const templates = (metadata?.promptTemplates as Record<string, string> | undefined) ?? {};
        const customCapabilities = (metadata?.customPromptCapabilities as PromptCapabilityItem[] | undefined) ?? [];

        const base = INTERNAL_AGENT_SKILLS.map((capability) => ({
            key: capability,
            title: INTERNAL_SKILL_INFO[capability].title,
            description: INTERNAL_SKILL_INFO[capability].description,
            prompt: templates[capability] ?? DEFAULT_INTERNAL_SKILL_PROMPTS[capability],
        }));

        const custom = customCapabilities.map((item) => ({
            key: item.key,
            title: item.title,
            description: item.description,
            prompt: templates[item.key] ?? item.prompt ?? '',
        }));

        return [...base, ...custom];
    }, [promptEngineerAgent]);

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto p-6 pb-32 space-y-5">
            <div className="flex items-center justify-end">
                <button
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary/90 transition-colors"
                >
                    <Plus className="size-4" />
                    Criar skill
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
                </div>
            ) : promptCapabilities.length === 0 ? (
                <div className="bento-card">
                    <p className="text-sm text-text-dim">Nenhuma skill encontrada.</p>
                </div>
            ) : (
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
                            <p className="text-xs text-text-dim line-clamp-6 whitespace-pre-wrap">{capability.prompt || DEFAULT_INTERNAL_SKILL_PROMPTS[capability.key as InternalAgentSkill]}</p>
                        </div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                        onClick={(event) => {
                            if (event.target === event.currentTarget) {
                                setOpen(false);
                            }
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 8 }}
                            transition={{ duration: 0.18 }}
                            className="relative h-[88vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-border bg-bg shadow-2xl"
                        >
                            <button
                                onClick={() => setOpen(false)}
                                className="sticky right-4 top-4 z-10 ml-auto mr-4 mt-4 flex size-9 items-center justify-center rounded-lg border border-border bg-card text-text-dim hover:text-accent"
                                aria-label="Fechar modal de skills"
                            >
                                <X className="size-4" />
                            </button>

                            <AgentManagementScreen defaultView="skills" hideViewSwitcher />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
