'use client';

import { useState } from 'react';
import { GitBranch, GitCommitHorizontal, GitGraph, Minus, RefreshCw, Undo2 } from 'lucide-react';
import { apiFetch } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/Toast';
import { ApiResponse, RepositoryInsights, RepositorySelectionEmptyState, useProjectInsights, useSelectedProjectState } from './repositoryViews/shared';

export function RepositoryGit() {
    const { workspace, selectedProject } = useSelectedProjectState();
    const { insights, insightsLoading, refetchInsights } = useProjectInsights(selectedProject?.id);
    const { toast } = useToast();
    const [gitBusy, setGitBusy] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');

    const stagedChanges = insights?.changes?.filter((change) => change.staged) ?? [];

    async function runGitAction(action: 'stage-all' | 'commit' | 'stage-file' | 'unstage-file' | 'discard-file', path?: string) {
        if (!selectedProject) return;
        if (action === 'commit' && !commitMessage.trim()) {
            toast('Digite uma mensagem de commit', 'error');
            return;
        }

        setGitBusy(true);
        try {
            await apiFetch<ApiResponse<RepositoryInsights>>(`/api/v1/projects/${selectedProject.id}/repository-insights`, {
                method: 'POST',
                body: JSON.stringify({ action, message: commitMessage, path }),
            });
            if (action === 'commit') {
                setCommitMessage('');
                toast('Commit realizado', 'success');
            } else if (action === 'stage-all') {
                toast('Mudanças staged com sucesso', 'success');
            }
            await refetchInsights();
        } catch (e: any) {
            toast(e.message ?? 'Falha na ação de Git', 'error');
        } finally {
            setGitBusy(false);
        }
    }

    if (!selectedProject) {
        return <RepositorySelectionEmptyState showWorkspaceHint={!workspace} />;
    }

    return (
        <div className="bento-card min-h-64 min-w-0 rounded-2xl sm:min-h-72">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <GitBranch className="size-4 text-primary" />
                    <p className="label-caps">Source control</p>
                </div>
                <div className="flex items-center gap-2">
                    {insights?.branch && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-text-dim">
                            {insights.branch}
                        </span>
                    )}
                    <button
                        onClick={() => void refetchInsights()}
                        disabled={insightsLoading || gitBusy}
                        title="Atualizar"
                        className="rounded-md border border-border p-1 text-text-dim hover:text-accent transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className="size-3.5" />
                    </button>
                </div>
            </div>

            <div className="space-y-2 border-b border-border/60 pb-4">
                <input
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Message (Ctrl+Enter para commit)"
                    onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            void runGitAction('commit');
                        }
                    }}
                    className="w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-highlight placeholder:text-text-dim focus:border-primary/60 outline-none transition-colors"
                />
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void runGitAction('commit')}
                        disabled={insightsLoading || gitBusy || !insights?.isGitRepo || !stagedChanges.length || !commitMessage.trim()}
                        className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        Commit
                    </button>
                    <button
                        onClick={() => void runGitAction('stage-all')}
                        disabled={insightsLoading || gitBusy || !insights?.isGitRepo}
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-accent hover:border-primary/60 transition-colors disabled:opacity-50"
                    >
                        Stage all
                    </button>
                </div>
            </div>

            <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                    <p className="label-caps">Changes</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-accent">
                        {insights?.changes?.length ?? 0}
                    </span>
                </div>
                {insightsLoading ? (
                    <p className="text-sm text-text-dim">Carregando mudanças...</p>
                ) : !insights?.isGitRepo ? (
                    <p className="text-sm text-text-dim">Pasta sem repositório Git válido.</p>
                ) : insights?.changes?.length ? (
                    <div className="max-h-56 space-y-1 overflow-y-auto pr-1 sm:max-h-72">
                        {insights.changes.map((change, index) => (
                            <div key={`${change.path}-${index}`} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-mono text-xs text-text-dim">{change.path}</p>
                                    <p className="text-[10px] text-text-dim/70">
                                        index:{change.indexStatus} worktree:{change.worktreeStatus}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className={cn(
                                        'shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                                        change.staged ? 'bg-green-500/15 text-green-400' : 'bg-zinc-500/20 text-zinc-300',
                                    )}>
                                        {change.status}
                                    </span>
                                    {change.unstaged && (
                                        <button
                                            title="Stage arquivo"
                                            onClick={() => void runGitAction('stage-file', change.path)}
                                            disabled={gitBusy || insightsLoading}
                                            className="rounded border border-border p-1 text-text-dim hover:text-accent transition-colors disabled:opacity-50"
                                        >
                                            <GitCommitHorizontal className="size-3" />
                                        </button>
                                    )}
                                    {change.staged && (
                                        <button
                                            title="Unstage arquivo"
                                            onClick={() => void runGitAction('unstage-file', change.path)}
                                            disabled={gitBusy || insightsLoading}
                                            className="rounded border border-border p-1 text-text-dim hover:text-accent transition-colors disabled:opacity-50"
                                        >
                                            <Minus className="size-3" />
                                        </button>
                                    )}
                                    {change.unstaged && (
                                        <button
                                            title="Descartar mudanças"
                                            onClick={() => void runGitAction('discard-file', change.path)}
                                            disabled={gitBusy || insightsLoading}
                                            className="rounded border border-border p-1 text-text-dim hover:text-red-400 transition-colors disabled:opacity-50"
                                        >
                                            <Undo2 className="size-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-text-dim">Sem mudanças pendentes.</p>
                )}
            </div>

            <div className="mt-5 border-t border-border/60 pt-4">
                <div className="mb-2 flex items-center gap-2">
                    <GitGraph className="size-4 text-primary" />
                    <p className="label-caps">Graph</p>
                </div>
                {insightsLoading ? (
                    <p className="text-sm text-text-dim">Carregando histórico...</p>
                ) : !insights?.isGitRepo ? (
                    <p className="text-sm text-text-dim">Pasta sem repositório Git válido.</p>
                ) : insights?.graphLines?.length ? (
                    <pre className="max-h-56 overflow-y-auto whitespace-pre font-mono text-[10px] text-text-dim sm:max-h-72 sm:text-[11px]">
                        {insights.graphLines.join('\n')}
                    </pre>
                ) : (
                    <p className="text-sm text-text-dim">Sem histórico disponível.</p>
                )}
            </div>
        </div>
    );
}
