'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Tool = {
  name: string;
  description: string;
  riskLevel: string;
  hasStreaming: boolean;
  permissions: string[];
};

const RISK_COLOR: Record<string, string> = {
  safe: '#16a34a',
  moderate: '#ca8a04',
  dangerous: '#dc2626',
};

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/v1/tools')
      .then(r => r.json())
      .then(d => setTools(d.tools ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tools.filter(t =>
    !filter || t.name.toLowerCase().includes(filter.toLowerCase()) || t.description.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)' }}>Tools</h1>
        <p style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 4 }}>{tools.length} registered tools available to agents</p>
      </div>

      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter tools…"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          color: 'var(--color-highlight)',
          outline: 'none',
          width: 260,
          marginBottom: 24,
          display: 'block',
        }}
      />

      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(t => (
            <div
              key={t.name}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-highlight)', fontFamily: 'monospace' }}>{t.name}</span>
                  {t.hasStreaming && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(245,194,0,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(245,194,0,0.25)' }}>streaming</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-accent)', lineHeight: 1.5 }}>{t.description}</p>
                {t.permissions.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {t.permissions.map(p => (
                      <span key={p} style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>🔑 {p}</span>
                    ))}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: `${RISK_COLOR[t.riskLevel] ?? '#52525b'}22`,
                  color: RISK_COLOR[t.riskLevel] ?? '#a1a1aa',
                  border: `1px solid ${RISK_COLOR[t.riskLevel] ?? '#52525b'}44`,
                  flexShrink: 0,
                  textTransform: 'capitalize',
                }}
              >
                {t.riskLevel}
              </span>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: 'var(--color-text-dim)' }}>No tools match your filter.</p>}
        </div>
      )}
    </DashboardLayout>
  );
}
