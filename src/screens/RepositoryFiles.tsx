'use client';

import { useMemo, useState } from 'react';
import { Folder } from 'lucide-react';
import {
    buildRepositoryTree,
    RepositorySelectionEmptyState,
    RepositoryTreeView,
    useProjectInsights,
    useSelectedProjectState,
} from './repositoryViews/shared';

export function RepositoryFiles() {
    const { workspace, selectedProject, isLoading } = useSelectedProjectState();
    const { insights, insightsLoading } = useProjectInsights(selectedProject?.id);
    const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

    const repositoryTree = useMemo(() => buildRepositoryTree(insights?.files ?? []), [insights?.files]);

    if (isLoading) {
        return <p className="text-sm text-text-dim py-8 text-center">Carregando repositório...</p>;
    }

    if (!selectedProject) {
        return <RepositorySelectionEmptyState showWorkspaceHint={!workspace} />;
    }

    return (
        <div className="min-h-64 min-w-0 sm:min-h-72">
            <div className="mb-3 flex items-center gap-2">
                <Folder className="size-4 text-primary" />
                <p className="label-caps">Lista de arquivos</p>
            </div>
            {insightsLoading ? (
                <p className="text-sm text-text-dim">Carregando arquivos...</p>
            ) : !insights?.isGitRepo ? (
                <p className="text-sm text-text-dim">Pasta sem repositório Git válido.</p>
            ) : insights?.files?.length ? (
                <div className="max-h-[68vh] space-y-0.5 overflow-y-auto pr-1">
                    <RepositoryTreeView
                        nodes={repositoryTree}
                        collapsedFolders={collapsedFolders}
                        onToggleFolder={(path) => setCollapsedFolders((prev) => ({ ...prev, [path]: !prev[path] }))}
                    />
                </div>
            ) : (
                <p className="text-sm text-text-dim">Nenhum arquivo encontrado.</p>
            )}
        </div>
    );
}
