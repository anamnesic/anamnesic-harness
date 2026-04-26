'use client';

import { Lightbulb } from 'lucide-react';
import { useRepository } from '@/src/context/RepositoryContext';
import { DecisionsPanel } from './DecisionsPanel';

export function Decisions() {
  const { repository, repositories, isLoading } = useRepository();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary/60 animate-spin mx-auto" />
          <p className="text-sm text-text-dim">Carregando repositórios...</p>
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Lightbulb className="size-12 text-primary/40 mx-auto" />
          <div>
            <h3 className="font-bold text-text mb-2">Nenhum repositório encontrado</h3>
            <p className="text-sm text-text-dim">
              Crie ou importe um repositório primeiro para começar a registrar decisões.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="bento-card mx-4 mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" />
            <h3 className="font-bold text-accent">
              Decisões do repositório: {repository?.name ?? 'Nenhum'}
            </h3>
          </div>
        </div>

        {repository?.id && (
          <div className="border-t border-border/60 pt-4">
            <DecisionsPanel projectId={repository.id} />
          </div>
        )}
      </div>
    </div>
  );
}
