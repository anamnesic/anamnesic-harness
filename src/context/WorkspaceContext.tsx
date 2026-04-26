'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  isDefault?: boolean;
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
      const response = await apiFetch<{
        items: Workspace[];
        total: number;
      }>('/api/v1/workspaces?limit=100');
      
      const items = response?.items || [];
      setWorkspaces(items);
      
      // If no workspace is selected and there are workspaces, select the default or first one
      if (!workspace && items.length > 0) {
        const defaultWorkspace = items.find(w => w.isDefault) || items[0];
        setWorkspace(defaultWorkspace);
        // Store in localStorage for persistence
        localStorage.setItem('kairos-selected-workspace', defaultWorkspace.id);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setWorkspaces([]);
      toast('Failed to load workspaces', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Try to load selected workspace from localStorage first
    const savedWorkspaceId = localStorage.getItem('kairos-selected-workspace');
    
    refreshWorkspaces().then(() => {
      if (savedWorkspaceId) {
        const savedWorkspace = workspaces.find(w => w.id === savedWorkspaceId);
        if (savedWorkspace) {
          setWorkspace(savedWorkspace);
        }
      }
    });
  }, []);

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
