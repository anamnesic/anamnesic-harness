'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Plus, X, Trash2, ExternalLink, MessageSquare, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { SkeletonCard } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    type: 'slack' | 'discord' | 'generic';
    events: string[];
    enabled: boolean;
}

export function Integrations() {
    const { data: webhooksResponse, loading, refetch } = useApi<WebhookConfig[] | { data?: WebhookConfig[] }>('/api/v1/integrations');
    const { toast } = useToast();

    // Handle both direct array and wrapped response formats
    const webhooks = webhooksResponse
        ? (Array.isArray(webhooksResponse) ? webhooksResponse : webhooksResponse.data ?? [])
        : [];
    
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [type, setType] = useState<'slack' | 'discord' | 'generic'>('generic');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (!name || !url) {
            toast('Nome e URL são obrigatórios', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await apiFetch('/api/v1/integrations', {
                method: 'POST',
                body: JSON.stringify({ name, url, type, events: ['*'], enabled: true }),
            });
            toast('Integração adicionada', 'success');
            refetch();
            setShowModal(false);
            setName('');
            setUrl('');
        } catch (e: any) {
            toast(e.message || 'Falha ao adicionar integração', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        try {
            await apiFetch(`/api/v1/integrations/${id}`, { method: 'DELETE' });
            toast('Integração removida', 'success');
            refetch();
        } catch (e: any) {
            toast(e.message || 'Falha ao remover integração', 'error');
        }
    }

    if (loading) return <div className="p-6 space-y-4"><SkeletonCard /><SkeletonCard /></div>;

    return (
        <div className="p-6 space-y-6 overflow-y-auto pb-24">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Share2 className="size-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Integrações externas</h2>
                        <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Conecte o Kairos às suas ferramentas favoritas</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                    <Plus className="size-3.5" />
                    Adicionar webhook
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(!webhooks || webhooks.length === 0) ? (
                    <div className="col-span-full bento-card text-center py-24 border-dashed">
                        <Globe className="size-12 text-border mx-auto mb-4" />
                        <h3 className="text-lg font-bold uppercase tracking-tighter">Nenhuma integração configurada</h3>
                        <p className="text-sm text-text-dim max-w-xs mx-auto mt-2">
                            Adicione um webhook de saída para receber notificações em tempo real no Slack, Discord ou qualquer endpoint personalizado.
                        </p>
                    </div>
                ) : (
                    webhooks.map(webhook => (
                        <div key={webhook.id} className="bento-card flex items-start justify-between gap-4 group">
                            <div className="flex items-start gap-4 min-w-0">
                                <div className={cn(
                                    "p-3 rounded-2xl shrink-0 border",
                                    webhook.type === 'slack' ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
                                    webhook.type === 'discord' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                                    "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
                                )}>
                                    {webhook.type === 'slack' ? <MessageSquare className="size-6" /> :
                                     webhook.type === 'discord' ? <MessageSquare className="size-6" /> :
                                     <Globe className="size-6" />}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-highlight truncate">{webhook.name}</h4>
                                    <p className="text-xs text-text-dim truncate max-w-xs font-mono">{webhook.url}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/5 border border-border text-text-dim">
                                            {webhook.events.includes('*') ? 'All Events' : `${webhook.events.length} Events`}
                                        </span>
                                        <span className={cn(
                                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                            webhook.enabled ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                                        )}>
                                            {webhook.enabled ? 'Ativo' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(webhook.id)}
                                className="p-2 rounded-xl text-text-dim hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="size-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* GitHub Integration Placeholder */}
            <div className="bento-card bg-zinc-900/50 border-dashed border-zinc-700!">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="label-caps">Conectores avançados</h3>
                </div>
                <div className="flex items-center gap-6 opacity-40 grayscale pointer-events-none">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span className="text-sm font-bold">GitHub Actions</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span className="text-sm font-bold">GitLab CI</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span className="text-sm font-bold">Integração com Linear</span>
                    </div>
                </div>
                <p className="text-[10px] text-text-dim mt-6 uppercase font-bold tracking-widest">Mais integrações em breve na Fase 9</p>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bento-card w-full max-w-lg space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black uppercase tracking-tighter">Adicionar novo webhook</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-white/5 text-text-dim transition-colors">
                                    <X className="size-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="label-caps px-1">Nome da integração</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-all"
                                        placeholder="ex.: Slack de Engenharia"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="label-caps px-1">URL do webhook</label>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm font-mono focus:outline-none focus:border-primary/60 transition-all"
                                        placeholder="https://hooks.slack.com/services/..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="label-caps px-1">Tipo de plataforma</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['generic', 'slack', 'discord'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setType(t)}
                                                className={cn(
                                                    "py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] transition-all",
                                                    type === t ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/5 border-border text-text-dim hover:border-border/80"
                                                )}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-border/40">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 rounded-xl border border-border text-sm font-bold uppercase tracking-widest text-text-dim hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {submitting ? 'Connecting...' : 'Enable Integration'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
