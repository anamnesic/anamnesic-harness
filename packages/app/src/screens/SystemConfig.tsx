'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Code2, CircleCheck, Share2, Package, Network, Server, AlertTriangle, RefreshCw } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { Skeleton, SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';
import { ApiKeys } from './ApiKeys';
import { AVAILABLE_MODELS } from '@/src/config/models';
import { useRepository } from '@/src/context/RepositoryContext';

const FLAG_LABELS: Record<string, string> = {
    enableStreaming: 'Streaming',
    enableMultimodalAgents: 'Multimodal Agents',
    enableSleepConsolidation: 'Sleep Consolidation',
    enableVectorMemory: 'Vector Memory',
    enableApprovalFlow: 'Approval Flow',
    enableMetricsCollection: 'Metrics Collection',
    enableAutonomousModification: 'Autonomous Modification',
    enableDeepRetrieval: 'Deep Retrieval',
    enableJitEngine: 'JIT Engine',
};

interface SettingsData {
    flags: Record<string, boolean>;
    aiSettings?: Record<string, unknown>;
    workspaceId?: string;
}
interface AvailabilityData {
    cli: Record<'copilot' | 'gemini' | 'kairos-code' | 'codex', boolean>;
    availableCli: string[];
    models: Record<string, boolean>;
}
interface MetricsData {
    nodeVersion?: string;
    platform?: string;
    uptime?: string;
    memory?: string;
    loadAvg?: string;
    threads?: number;
}

interface SystemAnalysisData {
    packages?: {
        total: number;
        production: number;
        development: number;
        vulnerabilities: number;
        outdated: number;
        details: any[];
    };
    services?: any[];
    network?: {
        interfaces: any[];
        openPorts: any[];
        hostname: string;
        dns?: string[];
    };
    system?: {
        platform: string;
        arch: string;
        nodeVersion: string;
        uptime: string;
        totalMemory: string;
        freeMemory: string;
        cpuCores: number;
    };
    analyzedAt: string;
}

const CLI_MODEL_IDS = new Set(['gpt-5.2-codex', 'gpt-5.3-codex']);

function isCliModel(modelId: string) {
    return CLI_MODEL_IDS.has(modelId) || modelId.includes('codex') || modelId.includes('grok-code');
}

export function SystemConfig({ onNavigate }: { onNavigate?: (id: string) => void }) {
    const { repository } = useRepository();
    const { data: settings, loading: settingsLoading } = useApi<SettingsData>('/api/v1/settings');
    const { data: metrics, loading: metricsLoading } = useApi<MetricsData>('/api/v1/metrics');
    // Include repository ID in the URL to trigger refetch when repository changes
    const availabilityUrl = repository ? `/api/v1/system/ai-availability?projectId=${repository.id}` : '/api/v1/system/ai-availability';
    const { data: availability, loading: availabilityLoading, refetch: refetchAvailability } = useApi<{ data?: AvailabilityData } | AvailabilityData>(availabilityUrl);
    const { data: systemAnalysis, loading: systemAnalysisLoading, refetch: refetchSystemAnalysis } = useApi<SystemAnalysisData>('/api/v1/system/analysis');
    const { toast } = useToast();

    const [localFlags, setLocalFlags] = useState<Record<string, boolean>>({});
    const [localModelStates, setLocalModelStates] = useState<Record<string, boolean>>({});
    const [proactivePlannerIntervalSeconds, setProactivePlannerIntervalSeconds] = useState(3600);
    const [selfOptimizationIntervalSeconds, setSelfOptimizationIntervalSeconds] = useState(3600);
    const [proactiveRefreshIntervalSeconds, setProactiveRefreshIntervalSeconds] = useState(3600);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    const availabilityPayload = (availability as { data?: AvailabilityData } | null)?.data
        ? (availability as { data?: AvailabilityData }).data
        : (availability as AvailabilityData | null);
    const availableModels = AVAILABLE_MODELS.filter((model) => availabilityPayload?.models?.[model.id] ?? false);
    const installedCli = availabilityPayload?.availableCli ?? [];

    const parseMsToSeconds = (value: unknown, fallback: number) =>
        typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.round(value / 1000)) : fallback;

    useEffect(() => {
        if (!settings?.flags) {
            return;
        }

        setLocalFlags(settings.flags);

        const nextModels: Record<string, boolean> = {};
        for (const model of availableModels) {
            const settingKey = `models.${model.id}`;
            const raw = settings.aiSettings?.[settingKey];
            nextModels[model.id] = typeof raw === 'boolean' ? raw : true;
        }
        setLocalModelStates(nextModels);
        setProactivePlannerIntervalSeconds(
            parseMsToSeconds(settings.aiSettings?.['proactive.planner.intervalMs'], 3600),
        );
        setSelfOptimizationIntervalSeconds(
            parseMsToSeconds(settings.aiSettings?.['selfOptimization.intervalMs'], 3600),
        );
        setProactiveRefreshIntervalSeconds(
            parseMsToSeconds(settings.aiSettings?.['proactive.ui.pollIntervalMs'], 3600),
        );
        setDirty(false);
    }, [settings, availabilityPayload]);

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
            const aiSettingsPayload: Record<string, any> = {};
            for (const [modelId, enabled] of Object.entries(localModelStates)) {
                aiSettingsPayload[`models.${modelId}`] = enabled;
            }

            aiSettingsPayload['proactive.planner.intervalMs'] = proactivePlannerIntervalSeconds * 1000;
            aiSettingsPayload['selfOptimization.intervalMs'] = selfOptimizationIntervalSeconds * 1000;
            aiSettingsPayload['proactive.ui.pollIntervalMs'] = proactiveRefreshIntervalSeconds * 1000;

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
        for (const model of availableModels) {
            const settingKey = `models.${model.id}`;
            const raw = settings?.aiSettings?.[settingKey];
            nextModels[model.id] = typeof raw === 'boolean' ? raw : true;
        }
        setLocalModelStates(nextModels);
        setProactivePlannerIntervalSeconds(
            parseMsToSeconds(settings?.aiSettings?.['proactive.planner.intervalMs'], 3600),
        );
        setSelfOptimizationIntervalSeconds(
            parseMsToSeconds(settings?.aiSettings?.['selfOptimization.intervalMs'], 3600),
        );
        setProactiveRefreshIntervalSeconds(
            parseMsToSeconds(settings?.aiSettings?.['proactive.ui.pollIntervalMs'], 3600),
        );
        setDirty(false);
    }

    async function handleRefreshSystemAnalysis() {
        setAnalyzing(true);
        try {
            await refetchSystemAnalysis();
            toast('System analysis updated', 'success');
        } catch (e: any) {
            toast(e.message ?? 'Failed to refresh system analysis', 'error');
        } finally {
            setAnalyzing(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-4xl mx-auto w-full space-y-4"
        >
            {/* Runtime Environment */}
            <div className="bento-card">
                <div className="flex items-center justify-between">
                    <span className="label-caps">Runtime Environment</span>
                    <button
                        onClick={handleRefreshSystemAnalysis}
                        disabled={analyzing}
                        className="p-2 rounded-lg text-text-dim hover:text-accent hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn("size-4", analyzing && "animate-spin")} />
                    </button>
                </div>
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

            {/* Proactive Timing Settings */}
            <div className="bento-card">
                <div className="flex items-center justify-between">
                    <span className="label-caps">Proactive Timers</span>
                    <span className="text-xs text-text-dim">Valores em segundos</span>
                </div>
                <div className="space-y-4 mt-4">
                    <div className="grid gap-4">
                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-[8px] font-black text-text-dim uppercase">Planejador proativo</label>
                            <p className="text-xs text-text-dim">Intervalo entre execuções do planejador proativo.</p>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={proactivePlannerIntervalSeconds}
                                onChange={(event) => setProactivePlannerIntervalSeconds(Math.max(1, Number(event.target.value) || 1))}
                                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-right text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-[8px] font-black text-text-dim uppercase">Auto-otimização</label>
                            <p className="text-xs text-text-dim">Intervalo entre execuções do serviço de auto-otimização.</p>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={selfOptimizationIntervalSeconds}
                                onChange={(event) => setSelfOptimizationIntervalSeconds(Math.max(1, Number(event.target.value) || 1))}
                                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-right text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <label className="text-[8px] font-black text-text-dim uppercase">Atualização de insights</label>
                            <p className="text-xs text-text-dim">Intervalo de polling para atualizar insights proativos no dashboard.</p>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={proactiveRefreshIntervalSeconds}
                                onChange={(event) => setProactiveRefreshIntervalSeconds(Math.max(1, Number(event.target.value) || 1))}
                                className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-right text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* System Analysis - Packages */}
            <div className="bento-card">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="size-5 text-primary" />
                    <span className="label-caps">Pacotes</span>
                </div>
                {systemAnalysisLoading ? (
                    <SkeletonCard />
                ) : systemAnalysis?.packages ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Total', val: systemAnalysis.packages.total },
                                { label: 'Prod', val: systemAnalysis.packages.production },
                                { label: 'Dev', val: systemAnalysis.packages.development },
                                { label: 'Vulns', val: systemAnalysis.packages.vulnerabilities, alert: systemAnalysis.packages.vulnerabilities > 0 },
                            ].map(stat => (
                                <div key={stat.label} className={cn("text-center p-3 rounded-xl border", stat.alert ? "bg-red-500/10 border-red-500/20" : "bg-bg border-border")}>
                                    <p className="text-2xl font-bold">{stat.val}</p>
                                    <p className="text-[8px] font-black text-text-dim uppercase mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                        {systemAnalysis.packages.vulnerabilities > 0 && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                <AlertTriangle className="size-4 text-red-500" />
                                <p className="text-xs text-red-400 font-bold">
                                    {systemAnalysis.packages.vulnerabilities} vulnerabilidades detectadas
                                </p>
                            </div>
                        )}
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {systemAnalysis.packages.details.slice(0, 10).map((pkg: any) => (
                                <div key={pkg.name} className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-accent">{pkg.name}</span>
                                        <span className="text-[10px] text-text-dim font-mono">{pkg.version}</span>
                                        {pkg.vulnerabilities > 0 && (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                                {pkg.vulnerabilities} vuln
                                            </span>
                                        )}
                                    </div>
                                    <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", pkg.type === 'production' ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400")}>
                                        {pkg.type === 'production' ? 'prod' : 'dev'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-text-dim">Nenhum dado de pacotes disponível</p>
                )}
            </div>

            {/* System Analysis - Services */}
            <div className="bento-card">
                <div className="flex items-center gap-2 mb-4">
                    <Server className="size-5 text-primary" />
                    <span className="label-caps">Serviços</span>
                </div>
                {systemAnalysisLoading ? (
                    <SkeletonCard />
                ) : systemAnalysis?.services ? (
                    <div className="space-y-2">
                        {systemAnalysis.services.length === 0 ? (
                            <p className="text-xs text-text-dim">Nenhum serviço detectado</p>
                        ) : (
                            systemAnalysis.services.map((service: any) => (
                                <div key={service.name} className="flex items-center justify-between p-3 rounded-xl bg-bg border border-border">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("size-2 rounded-full", service.status === 'running' ? "bg-green-500" : "bg-red-500")} />
                                        <div>
                                            <p className="text-xs font-bold text-accent">{service.name}</p>
                                            {service.pid && <p className="text-[10px] text-text-dim font-mono">PID: {service.pid}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-text-dim">
                                        {service.cpu && <span>CPU: {service.cpu}</span>}
                                        {service.memory && <span>MEM: {service.memory}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-text-dim">Nenhum dado de serviços disponível</p>
                )}
            </div>

            {/* System Analysis - Network */}
            <div className="bento-card">
                <div className="flex items-center gap-2 mb-4">
                    <Network className="size-5 text-primary" />
                    <span className="label-caps">Rede</span>
                </div>
                {systemAnalysisLoading ? (
                    <SkeletonCard />
                ) : systemAnalysis?.network ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase">Hostname</p>
                                <p className="text-sm font-bold font-mono">{systemAnalysis.network.hostname}</p>
                            </div>
                            {systemAnalysis.network.dns && systemAnalysis.network.dns.length > 0 && (
                                <div>
                                    <p className="text-[8px] font-black text-text-dim uppercase">DNS</p>
                                    <p className="text-sm font-bold font-mono">{systemAnalysis.network.dns.join(', ')}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-text-dim uppercase mb-2">Interfaces</p>
                            <div className="space-y-2">
                                {systemAnalysis.network.interfaces.map((iface: any) => (
                                    <div key={iface.interface} className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("size-2 rounded-full", iface.status === 'up' ? "bg-green-500" : "bg-red-500")} />
                                            <span className="text-xs font-bold text-accent">{iface.interface}</span>
                                        </div>
                                        <div className="text-xs text-text-dim font-mono">{iface.ip}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {systemAnalysis.network.openPorts && systemAnalysis.network.openPorts.length > 0 && (
                            <div>
                                <p className="text-[8px] font-black text-text-dim uppercase mb-2">Portas Abertas</p>
                                <div className="flex flex-wrap gap-2">
                                    {systemAnalysis.network.openPorts.map((port: any) => (
                                        <span key={`${port.protocol}-${port.port}`} className="text-[10px] font-black uppercase px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                                            {port.port}/{port.protocol}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-text-dim">Nenhum dado de rede disponível</p>
                )}
            </div>

            {/* AI Models */}
            <div className="bento-card">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <span className="label-caps">Modelos de IA</span>
                        <p className="text-xs text-text-dim mt-1">Modelos disponíveis com CLIs instalados e chaves configuradas.</p>
                    </div>
                </div>

                {!availabilityLoading && installedCli.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {installedCli.map((cliName) => (
                            <span key={cliName} className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                                {cliName}
                            </span>
                        ))}
                    </div>
                )}

                <div className="space-y-2 mt-4">
                    {availabilityLoading ? (
                        [0, 1, 2].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)
                    ) : availableModels.length === 0 ? (
                        <p className="text-xs text-text-dim py-2">Nenhum modelo disponível. Instale um CLI e configure suas chaves de API.</p>
                    ) : availableModels.map((model) => {
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
                    <p className="text-xs text-text-dim mt-1">Projeto: <span className="font-bold text-accent">{repository?.name ?? 'Nenhum'}</span></p>
                </div>
                {repository?.id && (
                    <ApiKeys projectId={repository.id} />
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
