'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { useAuth } from './AuthContext';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  isDefault?: boolean;
  metadata?: { isDefault?: boolean; [k: string]: unknown };
}

interface WorkspaceContextValue {
  workspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  setWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshWorkspaces = async () => {
    try {
      setIsLoading(true);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('kairos-token') : null;
      if (!token) {
        setWorkspaces([]);
        setIsLoading(false);
        return;
      }

      const response = await apiFetch<unknown>('/api/v1/workspaces?limit=100');
      
      // API wraps response in { success, data: { items, total } }
      const payload = (response as any)?.data ?? response;
      const items: Workspace[] = Array.isArray(payload?.items) ? payload.items
        : Array.isArray(payload) ? payload
        : [];
      setWorkspaces(items);
      
      // If no workspace is selected and there are workspaces, select the default or first one
      if (!workspace && items.length > 0) {
        const savedWorkspaceId = localStorage.getItem('kairos-selected-workspace');
        const savedWorkspace = savedWorkspaceId ? items.find(w => w.id === savedWorkspaceId) : null;
        const defaultWorkspace = savedWorkspace || items.find(w => w.isDefault || w.metadata?.isDefault) || items[0];
        
        setWorkspace(defaultWorkspace);
        localStorage.setItem('kairos-selected-workspace', defaultWorkspace.id);
      }
    } catch (error: any) {
      console.error('Failed to load workspaces:', error);
      if (error?.code !== 'UNAUTHORIZED') {
        toast('Failed to load workspaces', 'error');
      }
      setWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    refreshWorkspaces();
  }, [isAuthenticated]);

  const handleSetWorkspace = (newWorkspace: Workspace) => {
    setWorkspace(newWorkspace);
    localStorage.setItem('kairos-selected-workspace', newWorkspace.id);
    toast(`Switched to ${newWorkspace.name}`, 'success');
  };

  const value: WorkspaceContextValue = {
    workspace,
    workspaces,
    isLoading,
    setWorkspace: handleSetWorkspace,
    refreshWorkspaces,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

