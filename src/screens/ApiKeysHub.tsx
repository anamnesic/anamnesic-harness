'use client';

import { KeyRound } from 'lucide-react';
import { ApiKeys } from './ApiKeys';
import { useWorkspace } from '@/src/context/WorkspaceContext';
import { useRepository } from '@/src/context/RepositoryContext';

export function ApiKeysHub() {
    const { workspace } = useWorkspace();
    const { repository, repositories, isLoading } = useRepository();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bento-card max-w-md w-full text-center space-y-3">
                    <KeyRound className="size-8 text-primary mx-auto" />
                    <p className="text-sm text-text-dim">Carregando repositórios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 pb-32 max-w-3xl mx-auto w-full space-y-4">
            <div className="bento-card space-y-4">
                <div>
                    <span className="label-caps">Gerenciar chaves de API</span>
                    <p className="text-xs text-text-dim mt-1">
                        Repositório selecionado no app: {repository?.name ?? 'Nenhum'}
                    </p>
                    <p className="text-xs text-text-dim mt-1">
                        As chaves sao gravadas no arquivo .env do repositório selecionado (Claude, ChatGPT e Gemini).
                    </p>
                    {!workspace && (
                        <p className="text-xs text-yellow-400 mt-1">
                            Workspace nao selecionado. A gravacao segue funcionando pelo contexto do repositório.
                        </p>
                    )}
                </div>

                {repository?.id ? (
                    <ApiKeys projectId={repository.id} />
                ) : (
                    <p className="text-xs text-text-dim py-2">
                        {repositories.length > 0
                            ? 'Escolha um repositório no seletor global do cabeçalho.'
                            : 'Nenhum repositório disponível.'}
                    </p>
                )}
            </div>
        </div>
    );
}
