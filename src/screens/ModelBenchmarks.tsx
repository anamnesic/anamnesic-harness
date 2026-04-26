'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Zap, Clock, Coins, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApi } from '@/src/lib/api';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface ModelBenchmark {
    id: string;
    score: number;
    metrics: {
        totalTasks: number;
        successCount: number;
        failureCount: number;
        avgDuration: number;
        successRate: number;
        avgTokensPerTask: number;
    };
}

interface BenchmarkReport {
    timestamp: string;
    summary: string;
    bestModel: {
        bySuccessRate: string;
        byLatency: string;
        byCostEfficiency: string;
    };
    models: ModelBenchmark[];
}

export function ModelBenchmarks() {
    const [period, setPeriod] = useState<'hour' | 'day' | 'week'>('day');
    const { data, loading } = useApi<BenchmarkReport>(`/api/v1/benchmarks?period=${period}`);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                </div>
                <div className="bento-card h-96 animate-pulse bg-border/20" />
            </div>
        );
    }

    const report = data;
    if (!report || report.models.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <BarChart3 className="size-16 text-border" />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase tracking-tighter">Sem dados de benchmark</h3>
                    <p className="text-text-dim text-sm mt-1">Run some orchestrator tasks to generate model performance metrics.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-y-auto pb-24">
            {/* Period Selector */}
            <div className="flex justify-end">
                <div className="inline-flex rounded-xl bg-card border border-border p-1">
                    {(['hour', 'day', 'week'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                period === p ? "bg-primary text-white shadow-lg" : "text-text-dim hover:text-accent"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bento-card border-green-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                            <CheckCircle2 className="size-5" />
                        </div>
                        <span className="label-caps">Most Reliable</span>
                    </div>
                    <h4 className="text-xl font-bold truncate">{report.bestModel.bySuccessRate}</h4>
                    <p className="text-xs text-text-dim mt-1">Altaest success rate in tasks</p>
                </div>

                <div className="bento-card border-blue-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Zap className="size-5" />
                        </div>
                        <span className="label-caps">Fastest</span>
                    </div>
                    <h4 className="text-xl font-bold truncate">{report.bestModel.byLatency}</h4>
                    <p className="text-xs text-text-dim mt-1">Baixaest average response time</p>
                </div>

                <div className="bento-card border-yellow-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                            <Coins className="size-5" />
                        </div>
                        <span className="label-caps">Most Efficient</span>
                    </div>
                    <h4 className="text-xl font-bold truncate">{report.bestModel.byCostEfficiency}</h4>
                    <p className="text-xs text-text-dim mt-1">Fewest tokens used per task</p>
                </div>
            </div>

            {/* Models Table/List */}
            <div className="bento-card">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-bold uppercase tracking-tighter">Model Performance Index</h3>
                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">{report.summary}</p>
                    </div>
                    <TrendingUp className="size-5 text-primary" />
                </div>

                <div className="space-y-4">
                    {report.models.map((model, idx) => (
                        <motion.div
                            key={model.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group p-4 bg-bg border border-border rounded-2xl hover:border-primary/40 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-6">
                                {/* Model Identity & Score */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="text-base font-black truncate">{model.id}</h4>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                                            Score: {model.score.toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${model.score}%` }}
                                            className="h-full bg-primary"
                                        />
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4 shrink-0">
                                    <div className="flex flex-col">
                                        <span className="label-caps !mb-1">Taxa de sucesso</span>
                                        <span className={cn(
                                            "text-sm font-bold",
                                            model.metrics.successRate > 90 ? "text-green-400" : 
                                            model.metrics.successRate > 70 ? "text-yellow-400" : "text-red-400"
                                        )}>
                                            {model.metrics.successRate.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="label-caps !mb-1">Latency</span>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="size-3 text-text-dim" />
                                            <span className="text-sm font-bold">
                                                {(model.metrics.avgDuration / 1000).toFixed(2)}s
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="label-caps !mb-1">Token Avg</span>
                                        <div className="flex items-center gap-1.5">
                                            <Coins className="size-3 text-text-dim" />
                                            <span className="text-sm font-bold">
                                                {Math.round(model.metrics.avgTokensPerTask).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="label-caps !mb-1">Total Tasks</span>
                                        <span className="text-sm font-bold">
                                            {model.metrics.totalTasks}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                <AlertCircle className="size-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-text-dim leading-relaxed uppercase font-bold tracking-wider">
                    Benchmarks are calculated using a weighted index of success rates, processing latency, and token efficiency. 
                    Real-world performance may vary based on task complexity and prompt design.
                </p>
            </div>
        </div>
    );
}
