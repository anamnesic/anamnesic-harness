'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { FolderOpen, Terminal, Code2, Shield, ChevronRight } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface Observer {
    id: string;
    title: string;
    status: string;
    subtitle: string;
    active: boolean;
    eventCount?: number;
    lastEvent?: string;
}
interface ObserversData { observers: Observer[] }

const OBSERVER_ICONS: Record<string, any> = {
    fs: FolderOpen,
    terminal: Terminal,
    api: Code2,
};

export function Observers() {
    const { data, loading, refetch } = useApi<ObserversData>('/api/v1/observers');
    const { toast } = useToast();
    const [toggling, setToggling] = useState<string | null>(null);

    const observers = data?.observers ?? [];

    async function toggle(obs: Observer) {
        setToggling(obs.id);
        try {
            await apiFetch('/api/v1/observers', {
                method: 'PATCH',
                body: JSON.stringify({ id: obs.id, active: !obs.active }),
            });
            toast(`${obs.title} ${obs.active ? 'paused' : 'activated'}`, 'success');
            refetch();
        } catch (e: any) {
            toast(e.message ?? 'Toggle failed', 'error');
        } finally {
            setToggling(null);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 pb-32 max-w-4xl mx-auto w-full"
        >
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Ativo Nodes</h2>
                {!loading && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                            {observers.filter(o => o.active).length} Online
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    [0, 1, 2].map(i => <SkeletonCard key={i} />)
                ) : (
                    observers.map(obs => {
                        const Icon = OBSERVER_ICONS[obs.id] ?? Code2;
                        const isToggling = toggling === obs.id;
                        return (
                            <div key={obs.id} className={cn('bento-card', !obs.active && 'opacity-50 grayscale')}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-2xl bg-border text-accent">
                                        <Icon className="size-6" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-text-dim">
                                            {obs.status}
                                        </span>
                                        {obs.active && <div className="size-2 rounded-full bg-green-500 animate-pulse" />}
                                    </div>
                                </div>
                                <h4 className="font-bold text-highlight">{obs.title}</h4>
                                <p className="text-xs text-text-dim mt-1 truncate">{obs.subtitle}</p>

                                {obs.active && (
                                    <div className="mt-4 p-2 bg-bg rounded-lg border border-border/50">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-text-dim uppercase tracking-widest font-bold">Events Captured</span>
                                            <span className="text-accent font-mono">{obs.eventCount || 0}</span>
                                        </div>
                                        {obs.lastEvent && (
                                            <div className="mt-1 text-[9px] text-text-dim truncate font-mono">
                                                Last: {obs.lastEvent}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-auto pt-6 flex justify-end">
                                    <button
                                        onClick={() => toggle(obs)}
                                        disabled={isToggling}
                                        className={cn(
                                            'h-6 w-11 rounded-full p-1 transition-colors relative',
                                            obs.active ? 'bg-primary' : 'bg-border',
                                            isToggling && 'opacity-50 cursor-not-allowed',
                                        )}
                                    >
                                        <div className={cn(
                                            'h-4 w-4 bg-white rounded-full shadow-sm transition-transform',
                                            obs.active ? 'translate-x-5' : 'translate-x-0',
                                        )} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Context Safety card */}
                <div className="bento-card md:col-span-2">
                    <div className="flex items-center gap-2 text-primary mb-4">
                        <Shield className="size-5 fill-current" />
                        <span className="label-caps !mb-0 font-black">Context Safety</span>
                    </div>
                    <p className="text-sm text-text-dim leading-relaxed mb-6">
                        Exclusion patterns active to prevent credential leakage.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {['.env*', 'node_modules', '*_secret.json'].map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-border rounded-xl text-[10px] font-bold text-accent">
                                <ChevronRight className="size-3 text-primary" />
                                {tag}
                            </span>
                        ))}
                        <button
                            onClick={() => toast('Pattern configuration coming soon', 'info')}
                            className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                            Configure
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
