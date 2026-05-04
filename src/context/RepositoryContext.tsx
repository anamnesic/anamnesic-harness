'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { apiFetch } from '@/src/lib/api';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './AuthContext';

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
  const { isAuthenticated } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Start as false to avoid stuck loading
  const refreshInProgress = useRef(false);

  const refreshRepositories = async () => {
    // Prevent concurrent calls
    if (refreshInProgress.current) {
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('kairos-token') : null;
    if (!token) {
      // Only clear if there's no repository currently selected
      if (!repository) {
        setRepositories([]);
        setRepository(null);
      }
      setIsLoading(false);
      return;
    }

    try {
      refreshInProgress.current = true;
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

      // If no items returned, keep current state (might be temporary API error)
      if (!items.length) {
        setIsLoading(false);
        return;
      }

      setRepositories(items);

      const savedId = getSavedRepositoryId();
      const stillExists = savedId ? items.find((item) => item.id === savedId) : null;
      const currentStillExists = repository ? items.find((item) => item.id === repository.id) : null;
      const nextRepository = stillExists || currentStillExists || items[0];

      setRepository(nextRepository);
      setSavedRepositoryId(nextRepository.id);
    } catch {
      // Don't clear state on error - keep current repository
      // to avoid screens "disappearing" when API fails temporarily
    } finally {
      refreshInProgress.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceLoading || !isAuthenticated) {
      if (!workspaceLoading && !isAuthenticated) {
        setRepositories([]);
        setRepository(null);
        setIsLoading(false);
      }
      return;
    }

    refreshRepositories();
  }, [workspace?.id, workspaceLoading, isAuthenticated]);

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
