'use client';

import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { ApiKeys } from './ApiKeys';
import { useApi } from '@/src/lib/api';
import { useWorkspace } from '@/src/context/WorkspaceContext';

interface Project {
    id: string;
    name: string;
}

interface ProjectsResponse {
    success: boolean;
    data?: {
        items?: Project[];
    };
    timestamp: string;
}

export function ApiKeysHub() {
    const { workspace } = useWorkspace();
    const projectsPath = workspace?.id ? `/api/v1/workspaces/${workspace.id}/projects` : null;
    const { data, loading } = useApi<ProjectsResponse>(projectsPath);

    const projects = data?.data?.items ?? [];
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');

    useEffect(() => {
        if (!projects.length) {
            setSelectedProjectId('');
            return;
        }

        setSelectedProjectId((previous) => {
            if (previous && projects.some((project) => project.id === previous)) {
                return previous;
            }

            return projects[0].id;
        });
    }, [projects]);

    if (!workspace) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="bento-card max-w-md w-full text-center space-y-3">
                    <KeyRound className="size-8 text-primary mx-auto" />
                    <h3 className="font-bold text-accent">Nenhum workspace selecionado</h3>
                    <p className="text-sm text-text-dim">
                        Select a workspace to manage project API keys.
                    </p>
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
                        Workspace: {workspace.name}
                    </p>
                </div>

                <div>
                    <label className="label-caps mb-1.5 block">Selecionar projeto</label>
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        disabled={loading || projects.length === 0}
                        className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors disabled:opacity-60"
                    >
                        {projects.length === 0 ? (
                            <option value="">Nenhum projeto disponível</option>
                        ) : (
                            projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                {selectedProjectId ? (
                    <ApiKeys projectId={selectedProjectId} />
                ) : (
                    <p className="text-xs text-text-dim py-2">Escolha um projeto para ver as chaves.</p>
                )}
            </div>
        </div>
    );
}
