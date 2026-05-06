'use client';

import { Sidebar } from './Sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
        {children}
      </main>
    </div>
  );
}
