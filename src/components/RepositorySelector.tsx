'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, FolderGit2, Check, FolderOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useRepository } from '@/src/context/RepositoryContext';
import { FolderBrowser } from '@/src/components/FolderBrowser';
import { apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';

interface RepositorySelectorProps {
    hideWhenEmpty?: boolean;
}

export function RepositorySelector({ hideWhenEmpty = false }: RepositorySelectorProps) {
    const { repository, repositories, setRepositoryById, refreshRepositories, isLoading } = useRepository();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [showBrowser, setShowBrowser] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    if (isLoading) {
        return null;
    }

    const hasRepositories = repositories.length > 0;

    if (hideWhenEmpty && !hasRepositories) {
        return null;
    }

    async function handleFolderSelected(folderPath: string) {
        const base = folderPath.split(/[\\/]/).filter(Boolean).pop() || 'Project';
        setShowBrowser(false);
        setSubmitting(true);

        try {
            console.log('Enviando para API:', { name: base, localPath: folderPath });
            // O apiFetch já adiciona o header X-Workspace-Id automaticamente
            const created = await apiFetch<{ data?: { id?: string } }>('/api/v1/projects', {
                method: 'POST',
                body: JSON.stringify({ name: base, localPath: folderPath }),
            });

            const createdProjectId = created?.data?.id;
            if (createdProjectId && typeof window !== 'undefined') {
                localStorage.setItem('kairos-selected-repository', createdProjectId);
            }

            await refreshRepositories();

            if (createdProjectId) {
                setRepositoryById(createdProjectId);
            }

            toast(`Repositório "${base}" importado`, 'success');
        } catch (e: any) {
            // Tratar erro específico de pasta sem repositório Git
            if (e?.code === 'NO_GIT_REPO') {
                toast('A pasta selecionada não é um repositório Git. Selecione uma pasta com .git', 'error');
                return;
            }
            // Log detalhado para debug de erro 400
            // Evitar logar objetos complexos que podem causar erro
            try {
                // Log seguro convertendo para string JSON primeiro
                const safeMessage = e?.message || 'Unknown error';
                const safeCode = e?.code || null;
                const safeDetails = e?.details ? String(e?.details).substring(0, 200) : null;
                console.error('Erro ao importar repositório:', JSON.stringify({
                    message: safeMessage,
                    code: safeCode,
                    details: safeDetails,
                    folderPath
                }, null, 2));
                
                // Também logar o que estamos enviando para debug
                console.log('Dados enviados para API:', { name: base, localPath: folderPath });
            } catch (logError) {
                // Falha última no logging - log mínimo
                console.error('Erro ao importar repositório (logging failed):', {
                    message: e?.message || 'Unknown error',
                    folderPath
                });
            }
            toast(e?.message ?? 'Falha ao importar pasta', 'error');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => {
                    setIsOpen((open) => !open);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
                <FolderGit2 className="size-4 text-primary" />
                <span className="text-sm font-medium text-highlight truncate max-w-45">
                    {repository?.name || 'Selecionar repositório'}
                </span>
                <ChevronDown
                    className={cn(
                        'size-3.5 text-text-dim transition-transform',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                            <div className="p-2">
                                <div className="px-3 py-2 text-xs font-bold text-text-dim uppercase tracking-wider">
                                    Repositórios
                                </div>
                                {hasRepositories ? (
                                    repositories.map((repo) => (
                                        <button
                                            key={repo.id}
                                            onClick={() => {
                                                setRepositoryById(repo.id);
                                                setIsOpen(false);
                                            }}
                                            className={cn(
                                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                                                repository?.id === repo.id
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'hover:bg-bg text-accent hover:text-highlight',
                                            )}
                                        >
                                            <FolderGit2 className="size-4 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{repo.name}</div>
                                                {repo.metadata?.localPath && (
                                                    <div className="text-xs text-text-dim truncate" title={repo.metadata.localPath}>
                                                        {repo.metadata.localPath}
                                                    </div>
                                                )}
                                            </div>
                                            {repository?.id === repo.id && (
                                                <Check className="size-4 text-primary shrink-0" />
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-3 py-2 text-sm text-text-dim">Nenhum repositório importado.</div>
                                )}

                                <div className="my-2 border-t border-border" />

                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowBrowser(true);
                                    }}
                                    disabled={submitting}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-accent hover:text-highlight hover:bg-bg disabled:opacity-50"
                                >
                                    <FolderOpen className="size-4 shrink-0" />
                                    <span className="font-medium">{submitting ? 'Selecionando…' : 'Selecionar pasta do repositório'}</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showBrowser && (
                    <FolderBrowser
                        onClose={() => setShowBrowser(false)}
                        onSelect={handleFolderSelected}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}