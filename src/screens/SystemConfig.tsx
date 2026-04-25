'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Code2, CircleCheck } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { Skeleton, SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { ApiKeys } from './ApiKeys';

const FLAG_LABELS: Record<string, string> = {
    enableStreaming: 'Streaming',
    enableMultimodalAgents: 'Multimodal Agents',
    enableSleepConsolidation: 'Sleep Consolidation',
    enableVectorMemory: 'Vector Memory',
    enableApprovalFlow: 'Approval Flow',
    enableMetricsCollection: 'Metrics Collection',
};

interface SettingsData { flags: Record<string, boolean> }
interface MetricsData { uptime: string; memory: string; loadAvg: string; threads: number; platform: string; nodeVersion: string }
interface Project { id: string; name: string }

export function SystemConfig() {
    const { data: settings, loading: settingsLoading } = useApi<SettingsData>('/api/v1/settings');
    const { data: metrics, loading: metricsLoading } = useApi<MetricsData>('/api/v1/metrics');
    const { data: projects } = useApi<Project[]>('/api/v1/projects');
    const { toast } = useToast();

    const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    useEffect(() => {
        if (settings?.flags) {
            setLocalFlags(settings.flags);
            setDirty(false);
        }
    }, [settings]);

    function toggleFlag(key: string) {
        setLocalFlags(prev => ({ ...prev, [key]: !prev[key] }));
        setDirty(true);
    }

    async function handleCommit() {
        setSaving(true);
        try {
            await apiFetch('/api/v1/settings', {
                method: 'PATCH',
                body: JSON.stringify(localFlags),
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

            {/* API Keys */}
            <div className="bento-card space-y-4">
                <div>
                    <span className="label-caps">Manage API Keys</span>
                    <p className="text-xs text-text-dim mt-1">Select a project to manage its API keys</p>
                </div>
                <div>
                    <label className="label-caps mb-1.5 block">Select Project</label>
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
