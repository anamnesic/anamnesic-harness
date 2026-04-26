'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, FolderGit2, Check } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useRepository } from '@/src/context/RepositoryContext';

interface RepositorySelectorProps {
    hideWhenEmpty?: boolean;
}

export function RepositorySelector({ hideWhenEmpty = false }: RepositorySelectorProps) {
    const { repository, repositories, setRepositoryById, isLoading } = useRepository();
    const [isOpen, setIsOpen] = useState(false);

    if (isLoading) {
        return null;
    }

    const hasRepositories = repositories.length > 0;

    if (hideWhenEmpty && !hasRepositories) {
        return null;
    }

    return (
        <div className="relative">
            <button
                onClick={() => {
                    if (hasRepositories) {
                        setIsOpen((open) => !open);
                    }
                }}
                disabled={!hasRepositories}
                className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors disabled:opacity-60 disabled:hover:border-border"
            >
                <FolderGit2 className="size-4 text-primary" />
                <span className="text-sm font-medium text-highlight truncate max-w-45">
                    {repository?.name || 'Nenhum repositório'}
                </span>
                <ChevronDown
                    className={cn(
                        'size-3.5 text-text-dim transition-transform',
                        isOpen && 'rotate-180',
                    )}
                />
            </button>

            <AnimatePresence>
                {isOpen && hasRepositories && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                            <div className="p-2">
                                <div className="px-3 py-2 text-xs font-bold text-text-dim uppercase tracking-wider">
                                    Repositórios
                                </div>
                                {repositories.map((repo) => (
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
                                            {repo.description && (
                                                <div className="text-xs text-text-dim truncate">{repo.description}</div>
                                            )}
                                        </div>
                                        {repository?.id === repo.id && (
                                            <Check className="size-4 text-primary shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
