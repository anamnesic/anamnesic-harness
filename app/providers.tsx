'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/src/context/AuthContext';
import { ToastProvider } from '@/src/components/Toast';
import { WorkspaceProvider } from '@/src/context/WorkspaceContext';
import { RepositoryProvider } from '@/src/context/RepositoryContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        <WorkspaceProvider>
          <RepositoryProvider>
            {children}
          </RepositoryProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
