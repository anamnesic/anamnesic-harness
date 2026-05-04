'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Key, Save, Trash2 } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { Skeleton } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

type ProviderId = 'claude' | 'chatgpt' | 'gemini';

interface ProviderKeyStatus {
    provider: ProviderId;
    envVar: string;
    isConfigured: boolean;
    maskedValue: string | null;
}

interface KeysPayload {
    projectId: string;
    repositoryPath: string;
    envFilePath: string;
    keys: ProviderKeyStatus[];
}

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
}

const PROVIDERS: Array<{ id: ProviderId; label: string; helper: string; placeholder: string }> = [
    {
        id: 'chatgpt',
        label: 'ChatGPT (OpenAI)',
        helper: 'Salva em OPENAI_API_KEY no .env do repositorio.',
        placeholder: 'sk-...'
    },
    {
        id: 'claude',
        label: 'Claude (Anthropic)',
        helper: 'Salva em ANTHROPIC_API_KEY no .env do repositorio.',
        placeholder: 'sk-ant-...'
    },
    {
        id: 'gemini',
        label: 'Gemini (Google)',
        helper: 'Salva em GEMINI_API_KEY no .env do repositorio.',
        placeholder: 'AIza...'
    },
];

export function ApiKeys({ projectId }: { projectId: string }) {
    const { data, loading, refetch } = useApi<ApiEnvelope<KeysPayload>>(`/api/v1/projects/${projectId}/api-keys`);
    const { toast } = useToast();

    const payload = data?.data;
    const [values, setValues] = useState<Record<ProviderId, string>>({
        chatgpt: '',
        claude: '',
        gemini: '',
    });
    const [savingProvider, setSavingProvider] = useState<ProviderId | null>(null);
    const [removingProvider, setRemovingProvider] = useState<ProviderId | null>(null);

    const statusByProvider = useMemo(() => {
        const next: Partial<Record<ProviderId, ProviderKeyStatus>> = {};
        for (const item of payload?.keys ?? []) {
            next[item.provider] = item;
        }
        return next;
    }, [payload]);

    async function handleSave(provider: ProviderId) {
        const value = values[provider]?.trim();
        if (!value) {
            toast('Digite uma chave antes de salvar.', 'error');
            return;
        }

        setSavingProvider(provider);
        try {
            await apiFetch(`/api/v1/projects/${projectId}/api-keys`, {
                method: 'POST',
                body: JSON.stringify({ provider, value }),
            });
            setValues((prev) => ({ ...prev, [provider]: '' }));
            toast('Chave salva no .env do repositório.', 'success');
            refetch?.();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao salvar chave', 'error');
        } finally {
            setSavingProvider(null);
        }
    }

    async function handleRemove(provider: ProviderId) {
        setRemovingProvider(provider);
        try {
            await apiFetch(`/api/v1/projects/${projectId}/api-keys/${provider}`, { method: 'DELETE' });
            toast('Chave removida do .env.', 'success');
            refetch?.();
        } catch (e: any) {
            toast(e.message ?? 'Falha ao remover chave', 'error');
        } finally {
            setRemovingProvider(null);
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <span className="label-caps">Chaves IA no .env</span>
                <p className="text-[10px] text-text-dim uppercase tracking-wider truncate">
                    {payload?.envFilePath ?? '.env'}
                </p>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
            ) : (
                <div className="space-y-2">
                    {PROVIDERS.map((provider) => {
                        const status = statusByProvider[provider.id];
                        const isSaving = savingProvider === provider.id;
                        const isRemoving = removingProvider === provider.id;
                        return (
                            <motion.div
                                key={provider.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-bg border border-border rounded-xl px-4 py-3 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Key className="size-4 text-text-dim shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold truncate">{provider.label}</p>
                                            <p className="text-[10px] text-text-dim">{provider.helper}</p>
                                            <p className="text-[10px] text-text-dim font-mono mt-1">
                                                {status?.envVar ?? 'ENV_VAR'}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={cn(
                                            'px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0',
                                            status?.isConfigured
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-border text-text-dim',
                                        )}
                                    >
                                        {status?.isConfigured ? 'Configurada' : 'Nao configurada'}
                                    </span>
                                </div>

                                {status?.isConfigured && (
                                    <p className="text-xs text-text-dim font-mono">
                                        Valor atual: {status.maskedValue}
                                    </p>
                                )}

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="password"
                                        value={values[provider.id]}
                                        onChange={(e) => setValues((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                                        placeholder={provider.placeholder}
                                        className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                                    />
                                    <button
                                        onClick={() => handleSave(provider.id)}
                                        disabled={!values[provider.id].trim() || isSaving}
                                        className={cn(
                                            'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-highlight text-bg text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity',
                                            (!values[provider.id].trim() || isSaving) && 'opacity-40 cursor-not-allowed',
                                        )}
                                    >
                                        <Save className="size-3.5" />
                                        {isSaving ? 'Salvando' : 'Salvar'}
                                    </button>
                                    <button
                                        onClick={() => handleRemove(provider.id)}
                                        disabled={!status?.isConfigured || isRemoving}
                                        className={cn(
                                            'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-wider text-accent hover:border-primary/50 transition-colors',
                                            (!status?.isConfigured || isRemoving) && 'opacity-30 cursor-not-allowed',
                                        )}
                                    >
                                        <Trash2 className="size-3.5" />
                                        {isRemoving ? 'Removendo' : 'Remover'}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

