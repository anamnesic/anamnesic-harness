'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Play, Eye, Activity, Target, Shield, Bug, ExternalLink, ChevronRight, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface AttackPayload {
    payloadId: string;
    vector: string;
    payload: string;
    encoding: string;
    description: string;
}

interface SimulationResult {
    successful: boolean;
    detected: boolean;
    confidenceScore: number;
    impact: {
        dataAccess: boolean;
        codeExecution: boolean;
        systemCompromise: boolean;
        escalation: boolean;
    };
}

interface AttackSimulation {
    simulationId: string;
    vulnerabilityId: string;
    attackType: string;
    status: 'pending' | 'running' | 'succeeded' | 'failed' | 'blocked';
    startTime: number;
    endTime?: number;
    duration?: number;
    payloads: AttackPayload[];
    results: SimulationResult;
    metrics: {
        payloadsAttempted: number;
        payloadsBlocked: number;
        payloadsSuccessful: number;
        blockRatePercent: number;
    };
}

export function RedTeaming() {
    const { data: simulations, loading, refetch } = useApi<AttackSimulation[]>('/api/v1/security/simulations');
    const { toast } = useToast();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selected = simulations?.find(s => s.simulationId === selectedId);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-y-auto pb-24">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                        <Bug className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Advanced Red Teaming</h2>
                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Autonomous Attack Simulation Framework</p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-accent hover:border-red-500/40 transition-colors"
                >
                    <Activity className="size-3.5" />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List of Simulations */}
                <div className="lg:col-span-1 space-y-3">
                    <h3 className="label-caps px-1">Recent Simulations</h3>
                    {(!simulations || simulations.length === 0) ? (
                        <div className="bento-card text-center py-12">
                            <Shield className="size-8 text-border mx-auto mb-3" />
                            <p className="text-xs text-text-dim">No simulations yet. Start one from the Security Audit screen.</p>
                        </div>
                    ) : (
                        simulations.map(sim => (
                            <button
                                key={sim.simulationId}
                                onClick={() => setSelectedId(sim.simulationId)}
                                className={cn(
                                    "w-full text-left bento-card transition-all group",
                                    selectedId === sim.simulationId ? "border-red-500/40 bg-red-500/5" : "hover:border-border/80"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-red-500/80">
                                        {sim.attackType}
                                    </span>
                                    <div className={cn(
                                        "size-2 rounded-full",
                                        sim.status === 'succeeded' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                        sim.status === 'blocked' ? "bg-green-500" :
                                        sim.status === 'running' ? "bg-yellow-500 animate-pulse" : "bg-border"
                                    )} />
                                </div>
                                <h4 className="text-sm font-bold truncate mb-1">Sim-{sim.simulationId.slice(0, 8)}</h4>
                                <div className="flex items-center justify-between text-[10px] text-text-dim font-bold uppercase">
                                    <span>{new Date(sim.startTime).toLocaleTimeString()}</span>
                                    <span className={cn(
                                        sim.results.successful ? "text-red-400" : "text-green-400"
                                    )}>
                                        {sim.results.successful ? "Breached" : "Secure"}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Simulation Details */}
                <div className="lg:col-span-2 space-y-6">
                    {selected ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={selected.simulationId}
                            className="space-y-6"
                        >
                            {/* Summary Card */}
                            <div className="bento-card relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <ShieldAlert className="size-32 text-red-500" />
                                </div>
                                
                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="label-caps text-red-500">Simulation Report</p>
                                            <h3 className="text-2xl font-black tracking-tighter uppercase">{selected.attackType}</h3>
                                        </div>
                                        <div className={cn(
                                            "px-4 py-1.5 rounded-xl border font-black uppercase tracking-widest text-xs",
                                            selected.results.successful ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
                                        )}>
                                            {selected.results.successful ? "Security Breach" : "Attack Blocked"}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1">
                                            <span className="label-caps !mb-0">Confidence</span>
                                            <p className="text-xl font-bold">{selected.results.confidenceScore.toFixed(1)}%</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="label-caps !mb-0">Payloads</span>
                                            <p className="text-xl font-bold">{selected.metrics.payloadsAttempted}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="label-caps !mb-0">Block Rate</span>
                                            <p className="text-xl font-bold">{selected.metrics.blockRatePercent.toFixed(1)}%</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="label-caps !mb-0">Duration</span>
                                            <p className="text-xl font-bold">{selected.duration}ms</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-border/40">
                                        <h4 className="label-caps">Impact Assessment</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(selected.results.impact).map(([key, val]) => (
                                                <div key={key} className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider",
                                                    val ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-border text-text-dim"
                                                )}>
                                                    {val ? <AlertTriangle className="size-3" /> : <CheckCircle2 className="size-3" />}
                                                    {key.replace(/([A-Z])/g, ' $1')}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payloads List */}
                            <div className="bento-card">
                                <h4 className="label-caps mb-4">Attack Vectors & Payloads</h4>
                                <div className="space-y-3">
                                    {selected.payloads.map((p, idx) => (
                                        <div key={p.payloadId} className="p-3 bg-bg border border-border rounded-xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-red-500/70 uppercase">{p.vector}</span>
                                                <span className="text-[9px] font-mono text-text-dim">#{idx + 1}</span>
                                            </div>
                                            <p className="text-xs font-bold text-highlight">{p.description}</p>
                                            <div className="p-2 bg-black/20 rounded font-mono text-[10px] text-accent border border-white/5 break-all">
                                                {p.payload}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bento-card py-24 text-center border-dashed">
                            <Target className="size-12 text-border mb-4" />
                            <h3 className="text-lg font-bold uppercase tracking-tighter">No Simulation Selected</h3>
                            <p className="text-sm text-text-dim max-w-xs mt-2">
                                Select a simulation from the list to view detailed attack reports and impact analysis.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
