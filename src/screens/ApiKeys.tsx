'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Copy, Key } from 'lucide-react';
import { useApi, apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { Skeleton } from '@/src/components/Skeleton';
import { cn } from '@/src/lib/utils';

interface ApiKey {
    id: string;
    name: string;
    lastUsed: string | null;
    isActive: boolean;
    project: { id: string; name: string };
    createdAt: string;
    revokedAt: string | null;
}

interface GeneratedKey extends ApiKey {
    key: string;
}

export function ApiKeys({ projectId }: { projectId: string }) {
    const { data: keys, loading, refetch } = useApi<ApiKey[]>(`/api/v1/projects/${projectId}/api-keys`);
    const { toast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [keyName, setKeyName] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    async function handleGenerate() {
        if (!keyName.trim()) return;
        setGenerating(true);
        try {
            const result = await apiFetch<GeneratedKey>(`/api/v1/projects/${projectId}/api-keys`, {
                method: 'POST',
                body: JSON.stringify({ name: keyName.trim() }),
            });
            setGeneratedKey(result.key);
            refetch?.();
        } catch (e: any) {
            toast(e.message ?? 'Failed to generate key', 'error');
            closeModal();
        } finally {
            setGenerating(false);
        }
    }

    async function handleRevoke(keyId: string) {
        setRevokingId(keyId);
        try {
            await apiFetch(`/api/v1/projects/${projectId}/api-keys/${keyId}`, { method: 'DELETE' });
            toast('Key revoked', 'success');
            refetch?.();
        } catch (e: any) {
            toast(e.message ?? 'Failed to revoke key', 'error');
        } finally {
            setRevokingId(null);
        }
    }

    async function handleCopy() {
        if (!generatedKey) return;
        await navigator.clipboard.writeText(generatedKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function closeModal() {
        setShowModal(false);
        setKeyName('');
        setGeneratedKey(null);
        setCopied(false);
    }

    function openModal() {
        setGeneratedKey(null);
        setKeyName('');
        setCopied(false);
        setShowModal(true);
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="label-caps">API Keys</span>
                <button
                    onClick={openModal}
                    className="px-4 py-2 bg-highlight text-bg rounded-xl font-black text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity"
                >
                    Generate Key
                </button>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[0, 1, 2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
            ) : !keys || keys.length === 0 ? (
                <p className="text-xs text-text-dim py-4 text-center">No API keys for this project</p>
            ) : (
                <div className="space-y-2">
                    {keys.map(k => (
                        <motion.div
                            key={k.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between bg-bg border border-border rounded-xl px-4 py-3 gap-4"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Key className="size-4 text-text-dim shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{k.name}</p>
                                    <p className="text-[10px] text-text-dim font-mono">
                                        {'••••••••••' + k.id.slice(-4)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0 text-[10px] text-text-dim">
                                <div className="hidden sm:block">
                                    <p className="font-black uppercase" style={{ fontSize: '8px' }}>Last Used</p>
                                    <p>{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : 'Never'}</p>
                                </div>
                                <div className="hidden sm:block">
                                    <p className="font-black uppercase" style={{ fontSize: '8px' }}>Created</p>
                                    <p>{new Date(k.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span
                                    className={cn(
                                        'px-2 py-0.5 rounded-full text-[9px] font-black uppercase',
                                        k.isActive
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-border text-text-dim',
                                    )}
                                >
                                    {k.isActive ? 'Active' : 'Revoked'}
                                </span>
                                <button
                                    onClick={() => handleRevoke(k.id)}
                                    disabled={!k.isActive || revokingId === k.id}
                                    className={cn(
                                        'p-1 rounded-lg hover:bg-border transition-colors',
                                        (!k.isActive || revokingId === k.id) && 'opacity-30 cursor-not-allowed',
                                    )}
                                    title="Revoke key"
                                >
                                    <X className="size-3.5 text-text-dim" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bento-card w-full max-w-md mx-4 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <span className="label-caps">Generate API Key</span>
                            <button onClick={closeModal} className="p-1 hover:bg-border rounded-lg transition-colors">
                                <X className="size-4" />
                            </button>
                        </div>

                        {generatedKey ? (
                            <div className="space-y-3">
                                <p className="text-xs font-black text-yellow-400 uppercase tracking-wide">
                                    This key will only be shown once — copy it now
                                </p>
                                <div className="relative">
                                    <code className="block w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs font-mono break-all pr-12">
                                        {generatedKey}
                                    </code>
                                    <button
                                        onClick={handleCopy}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-border rounded-lg transition-colors"
                                        title="Copy key"
                                    >
                                        <Copy className="size-4" />
                                    </button>
                                </div>
                                {copied && (
                                    <p className="text-[10px] text-green-400 font-black uppercase tracking-wide">Copied!</p>
                                )}
                                <button
                                    onClick={closeModal}
                                    className="w-full py-2.5 bg-highlight text-bg rounded-xl font-black text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="label-caps mb-1.5 block">Key Name</label>
                                    <input
                                        type="text"
                                        value={keyName}
                                        onChange={e => setKeyName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !generating && handleGenerate()}
                                        placeholder="e.g. Production CI"
                                        className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={closeModal}
                                        className="px-4 py-2 border border-border rounded-xl text-accent font-black text-[10px] tracking-widest uppercase hover:bg-card transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!keyName.trim() || generating}
                                        className={cn(
                                            'px-4 py-2 bg-highlight text-bg rounded-xl font-black text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity',
                                            (!keyName.trim() || generating) && 'opacity-40 cursor-not-allowed',
                                        )}
                                    >
                                        {generating ? 'Generating…' : 'Generate'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
