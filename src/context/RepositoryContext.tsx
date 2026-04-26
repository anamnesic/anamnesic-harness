'use client';

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { apiFetch } from '@/src/lib/api';
import { useWorkspace } from './WorkspaceContext';

interface Repository {
  id: string;
  name: string;
  description?: string | null;
  workspaceId?: string | null;
  metadata?: { localPath?: string;[k: string]: unknown } | null;
}

interface RepositoryContextValue {
  repository: Repository | null;
  repositories: Repository[];
  isLoading: boolean;
  setRepositoryById: (repositoryId: string) => void;
  refreshRepositories: () => Promise<void>;
}

const RepositoryContext = createContext<RepositoryContextValue | undefined>(undefined);

function getSavedRepositoryId() {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('kairos-selected-repository');
}

function setSavedRepositoryId(repositoryId: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (repositoryId) {
    localStorage.setItem('kairos-selected-repository', repositoryId);
    return;
  }

  localStorage.removeItem('kairos-selected-repository');
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
}

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRepositories = async () => {
    try {
      setIsLoading(true);
      const endpoint = workspace?.id
        ? `/api/v1/projects?workspaceId=${workspace.id}`
        : '/api/v1/projects';

      const response = await apiFetch<{ items?: Repository[]; data?: Repository[] }>(
        endpoint,
      );

      const items = Array.isArray(response as unknown as Repository[])
        ? (response as unknown as Repository[])
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.items)
            ? response.items
            : [];

      setRepositories(items);

      if (!items.length) {
        setRepository(null);
        setSavedRepositoryId(null);
        return;
      }

      const savedId = getSavedRepositoryId();
      const stillExists = savedId ? items.find((item) => item.id === savedId) : null;
      const currentStillExists = repository ? items.find((item) => item.id === repository.id) : null;
      const nextRepository = stillExists || currentStillExists || items[0];

      setRepository(nextRepository);
      setSavedRepositoryId(nextRepository.id);
    } catch {
      setRepositories([]);
      setRepository(null);
      setSavedRepositoryId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceLoading) {
      return;
    }

    refreshRepositories();
  }, [workspace?.id, workspaceLoading]);

  const value = useMemo<RepositoryContextValue>(() => ({
    repository,
    repositories,
    isLoading,
    setRepositoryById: (repositoryId: string) => {
      const nextRepository = repositories.find((item) => item.id === repositoryId);
      if (!nextRepository) {
        return;
      }

      setRepository(nextRepository);
      setSavedRepositoryId(nextRepository.id);
    },
    refreshRepositories,
  }), [repository, repositories, isLoading]);

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
}
