'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Code2, CircleCheck, Share2 } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { Skeleton, SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { ApiKeys } from './ApiKeys';
import { AVAILABLE_MODELS } from '@/src/config/models';

const FLAG_LABELS: Record<string, string> = {
    enableStreaming: 'Streaming',
    enableMultimodalAgents: 'Multimodal Agents',
    enableSleepConsolidation: 'Sleep Consolidation',
    enableVectorMemory: 'Vector Memory',
    enableApprovalFlow: 'Approval Flow',
    enableMetricsCollection: 'Metrics Collection',
};

interface SettingsData {
    flags: Record<string, boolean>;
    aiSettings?: Record<string, unknown>;
    workspaceId?: string;
}
interface MetricsData { uptime: string; memory: string; loadAvg: string; threads: number; platform: string; nodeVersion: string }
interface Project { id: string; name: string }

const CLI_MODEL_IDS = new Set(['gpt-5.2-codex', 'gpt-5.3-codex']);

function isCliModel(modelId: string) {
    return CLI_MODEL_IDS.has(modelId) || modelId.includes('codex') || modelId.includes('grok-code');
}

export function SystemConfig({ onNavigate }: { onNavigate?: (id: string) => void }) {
    const { data: settings, loading: settingsLoading } = useApi<SettingsData>('/api/v1/settings');
    const { data: metrics, loading: metricsLoading } = useApi<MetricsData>('/api/v1/metrics');
    const { data: projects } = useApi<Project[]>('/api/v1/projects');
    const { toast } = useToast();

    const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});
    const [localModelStates, setLocalModelStates] = useState<Record<string, boolean>>({});
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    useEffect(() => {
        if (!settings?.flags) {
            return;
        }

        setLocalFlags(settings.flags);

        const nextModels: Record<string, boolean> = {};
        for (const model of AVAILABLE_MODELS) {
            const settingKey = `models.${model.id}`;
            const raw = settings.aiSettings?.[settingKey];
            nextModels[model.id] = typeof raw === 'boolean' ? raw : true;
        }
        setLocalModelStates(nextModels);
        setDirty(false);
    }, [settings]);

    function toggleFlag(key: string) {
        setLocalFlags(prev => ({ ...prev, [key]: !prev[key] }));
        setDirty(true);
    }

    function toggleModel(modelId: string) {
        setLocalModelStates(prev => ({ ...prev, [modelId]: !prev[modelId] }));
        setDirty(true);
    }

    async function handleCommit() {
        setSaving(true);
        try {
            const aiSettingsPayload: Record<string, boolean> = {};
            for (const [modelId, enabled] of Object.entries(localModelStates)) {
                aiSettingsPayload[`models.${modelId}`] = enabled;
            }

            await apiFetch('/api/v1/settings', {
                method: 'PATCH',
                body: JSON.stringify({
                    workspaceId: settings?.workspaceId ?? 'system',
                    flags: localFlags,
                    aiSettings: aiSettingsPayload,
                }),
            });
            toast('Settings committed', 'success');
            setDirty(false);
        } catch (e: any) {
            toast(e.message ?? 'Commit failed', 'error');
        } finally {
            setSaving(false);
        }
    }

    function handleDiscard() {
        if (settings?.flags) setLocalFlags(settings.flags);
        const nextModels: Record<string, boolean> = {};
        for (const model of AVAILABLE_MODELS) {
            const settingKey = `models.${model.id}`;
            const raw = settings?.aiSettings?.[settingKey];
            nextModels[model.id] = typeof raw === 'boolean' ? raw : true;
        }
        setLocalModelStates(nextModels);
        setDirty(false);
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-4xl mx-auto w-full space-y-4"
        >
            {/* Runtime Environment */}
            <div className="bento-card">
                <span className="label-caps">Runtime Environment</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {metricsLoading ? (
                        [0, 1].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)
                    ) : (
                        [
                            { label: 'Node.js', val: metrics?.nodeVersion ?? '—' },
                            { label: 'Platform', val: metrics?.platform ?? '—' },
                        ].map(env => (
                            <div key={env.label} className="bg-bg border border-border p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Code2 className="size-5 text-text-dim" />
                                    <div>
                                        <p className="text-[8px] font-black text-text-dim uppercase">{env.label}</p>
                                        <p className="text-sm font-bold font-mono">{env.val}</p>
                                    </div>
                                </div>
                                <CircleCheck className="size-5 text-green-500" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* External Tools Card */}
            <div className="bento-card border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="label-caps text-primary">Connect External Tools</span>
                        <p className="text-xs text-text-dim mt-1">Configure outgoing webhooks for Slack, Discord and automation platforms.</p>
                    </div>
                    <button
                        onClick={() => onNavigate?.('integrations')}
                        className="bg-primary text-white p-3 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <Share2 className="size-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hardware Stats */}
                <div className="bento-card">
                    <span className="label-caps">Hardware Stats</span>
                    {metricsLoading ? (
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {[
                                { label: 'LOAD', val: metrics?.loadAvg ?? '—' },
                                { label: 'MEM', val: metrics?.memory ?? '—' },
                                { label: 'THR', val: String(metrics?.threads ?? '—') },
                                { label: 'UP', val: metrics?.uptime ?? '—' },
                            ].map(item => (
                                <div key={item.label}>
                                    <p className="text-[8px] font-black text-text-dim uppercase leading-none">{item.label}</p>
                                    <p className="text-xl font-black mt-1 tracking-tight">{item.val}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Feature Flags */}
                <div className="bento-card">
                    <span className="label-caps">Flags & Features</span>
                    {settingsLoading ? (
                        <div className="space-y-4 mt-4">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className="flex items-center justify-between">
                                    <Skeleton className="h-3 w-36" />
                                    <Skeleton className="h-5 w-9 rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4 mt-4">
                            {Object.entries(localFlags).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-accent">
                                        {FLAG_LABELS[key] ?? key}
                                    </span>
                                    <button
                                        onClick={() => toggleFlag(key)}
                                        className={cn(
                                            'h-5 w-9 rounded-full p-0.5 flex items-center transition-colors cursor-pointer',
                                            val ? 'bg-primary' : 'bg-border',
                                        )}
                                    >
                                        <div className={cn('size-4 bg-white rounded-full transition-transform', val ? 'translate-x-4' : 'translate-x-0')} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* AI Models */}
            <div className="bento-card">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <span className="label-caps">Modelos de IA</span>
                        <p className="text-xs text-text-dim mt-1">Ative ou desative os modelos disponíveis no projeto (inclui modelos de CLI).</p>
                    </div>
                </div>
                <div className="space-y-2 mt-4">
                    {AVAILABLE_MODELS.map((model) => {
                        const enabled = localModelStates[model.id] ?? true;
                        const cli = isCliModel(model.id);

                        return (
                            <div key={model.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-bg px-3 py-2.5">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="text-xs font-bold text-accent truncate">{model.name}</p>
                                        <span className="rounded-full bg-card px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-text-dim shrink-0">
                                            {model.group}
                                        </span>
                                        {cli && (
                                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary shrink-0">
                                                CLI
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-text-dim truncate">{model.id} · {model.description}</p>
                                </div>
                                <button
                                    onClick={() => toggleModel(model.id)}
                                    className={cn(
                                        'h-5 w-9 rounded-full p-0.5 flex items-center transition-colors cursor-pointer shrink-0',
                                        enabled ? 'bg-primary' : 'bg-border',
                                    )}
                                >
                                    <div className={cn('size-4 bg-white rounded-full transition-transform', enabled ? 'translate-x-4' : 'translate-x-0')} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* API Keys */}
            <div className="bento-card space-y-4">
                <div>
                    <span className="label-caps">Gerenciar chaves de API</span>
                    <p className="text-xs text-text-dim mt-1">Select a project to manage its API keys</p>
                </div>
                <div>
                    <label className="label-caps mb-1.5 block">Selecionar projeto</label>
                    <select
                        value={selectedProjectId ?? ''}
                        onChange={e => setSelectedProjectId(e.target.value || null)}
                        className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                    >
                        <option value="">— Choose a project —</option>
                        {Array.isArray(projects) && projects.map((p: Project) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                {selectedProjectId && (
                    <ApiKeys projectId={selectedProjectId} />
                )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2">
                <button
                    onClick={handleDiscard}
                    disabled={!dirty}
                    className={cn(
                        'px-6 py-3 border border-border rounded-xl text-accent font-black text-[10px] tracking-widest uppercase hover:bg-card transition-colors',
                        !dirty && 'opacity-40 cursor-not-allowed',
                    )}
                >
                    Discard
                </button>
                <button
                    onClick={handleCommit}
                    disabled={!dirty || saving}
                    className={cn(
                        'px-6 py-3 bg-highlight text-bg rounded-xl font-black text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity',
                        (!dirty || saving) && 'opacity-40 cursor-not-allowed',
                    )}
                >
                    {saving ? 'Saving…' : 'Commit Changes'}
                </button>
            </div>
        </motion.div>
    );
}
