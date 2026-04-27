'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, FolderGit2, ArrowUp, X, Check, Loader2, Home } from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

interface BrowseEntry {
    name: string;
    path: string;
    isGitRepo: boolean;
}

interface BrowseResult {
    currentPath: string;
    parent: string | null;
    directories: BrowseEntry[];
    shortcuts: { name: string; path: string }[];
}

interface FolderBrowserProps {
    initialPath?: string;
    onSelect: (path: string) => void;
    onClose: () => void;
}

export function FolderBrowser({ initialPath, onSelect, onClose }: FolderBrowserProps) {
    const [path, setPath] = useState<string | undefined>(initialPath);
    const [data, setData] = useState<BrowseResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        const qs = path ? `?path=${encodeURIComponent(path)}` : '';
        apiFetch<BrowseResult>(`/api/v1/fs/browse${qs}`)
            .then(res => {
                if (cancelled) return;
                // apiFetch may unwrap { success, data } envelope
                const payload = (res as any)?.data ?? res;
                setData(payload as BrowseResult);
            })
            .catch(e => { if (!cancelled) setError(e?.message ?? 'Failed to browse'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [path]);

    return createPortal(
        <motion.div
            key="folder-browser-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-4 sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                key="folder-browser-modal"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="bento-card w-full max-w-2xl space-y-4 max-h-[80vh] flex flex-col"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Select Folder</h3>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-text-dim hover:text-accent transition-colors"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Shortcuts */}
                {data?.shortcuts && (
                    <div className="flex flex-wrap gap-2">
                        {data.shortcuts.map(s => (
                            <button
                                key={s.path}
                                onClick={() => setPath(s.path)}
                                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-text-dim hover:text-accent hover:border-primary/40 transition-colors"
                            >
                                <Home className="size-3" />
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Path bar */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => data?.parent && setPath(data.parent)}
                        disabled={!data?.parent}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-text-dim hover:text-accent hover:border-primary/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Up"
                    >
                        <ArrowUp className="size-4" />
                    </button>
                    <input
                        className="flex-1 rounded-xl bg-bg border border-border px-3 py-2 text-xs font-mono text-accent placeholder-text-dim focus:outline-none focus:border-primary"
                        placeholder="Type a path..."
                        value={data?.currentPath ?? path ?? ''}
                        onChange={e => setData(data ? { ...data, currentPath: e.target.value } : null)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                const v = (e.target as HTMLInputElement).value.trim();
                                if (v) setPath(v);
                            }
                        }}
                    />
                </div>

                {/* Directory list */}
                <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-bg/40">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="size-5 animate-spin text-text-dim" />
                        </div>
                    ) : error ? (
                        <div className="p-6 text-sm text-red-400">{error}</div>
                    ) : !data?.directories.length ? (
                        <div className="p-6 text-sm text-text-dim text-center">No subdirectories</div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {data.directories.map(d => (
                                <li key={d.path}>
                                    <button
                                        onClick={() => setPath(d.path)}
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-card transition-colors"
                                    >
                                        {d.isGitRepo ? (
                                            <FolderGit2 className="size-4 text-primary shrink-0" />
                                        ) : (
                                            <Folder className="size-4 text-text-dim shrink-0" />
                                        )}
                                        <span className={cn(
                                            'text-sm truncate',
                                            d.isGitRepo ? 'text-accent font-bold' : 'text-text',
                                        )}>{d.name}</span>
                                        {d.isGitRepo && (
                                            <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                                                git
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-text-dim hover:text-accent transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { if (data?.currentPath) onSelect(data.currentPath); }}
                        disabled={!data?.currentPath || loading}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-highlight py-3 text-sm font-bold text-bg hover:bg-accent transition-colors disabled:opacity-50"
                    >
                        <Check className="size-4" />
                        Use this folder
                    </button>
                </div>
            </motion.div>
        </motion.div>
    , document.body);
}
