'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Workflow = {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
  steps?: unknown[];
  triggers?: { type: string; config: unknown }[];
  isActive?: boolean;
  createdAt?: string;
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () =>
    fetch('/api/v1/workflows')
      .then(r => r.json())
      .then(d => setWorkflows(d.data ?? []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch('/api/v1/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
    });
    setNewName('');
    setNewDesc('');
    setCreating(false);
    load();
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)' }}>Workflows</h1>
          <p style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 4 }}>Automated multi-step pipelines</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Workflow name…" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none', width: 180 }} />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none', width: 200 }} />
          <button onClick={create} disabled={creating || !newName.trim()} style={{ padding: '8px 18px', borderRadius: 8, background: !newName.trim() ? 'var(--color-border)' : 'var(--color-primary)', border: 'none', color: !newName.trim() ? 'var(--color-accent)' : '#000', fontWeight: 600, fontSize: 13, cursor: !newName.trim() ? 'not-allowed' : 'pointer' }}>
            + Create
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
      ) : workflows.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No workflows yet. Create one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workflows.map(w => (
            <div key={w.id} style={{ background: 'var(--color-card)', border: `1px solid ${expanded === w.id ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 12, overflow: 'hidden' }}>
              <div
                onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-highlight)', marginBottom: 3 }}>{w.name}</div>
                  {w.description && <div style={{ fontSize: 12, color: 'var(--color-accent)' }}>{w.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
                    {(w.steps?.length ?? 0)} steps · {(w.triggers?.length ?? 0)} triggers
                  </span>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: w.isActive ? 'rgba(22,163,74,0.15)' : 'var(--color-border)', color: w.isActive ? '#16a34a' : 'var(--color-text-dim)' }}>
                    {w.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span style={{ color: 'var(--color-text-dim)', fontSize: 14 }}>{expanded === w.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === w.id && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ paddingTop: 12, fontSize: 12, color: 'var(--color-accent)' }}>
                    <strong style={{ color: 'var(--color-text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em' }}>Triggers</strong>
                    <div style={{ marginTop: 6 }}>
                      {w.triggers?.map((t, i) => (
                        <span key={i} style={{ marginRight: 8, padding: '2px 8px', borderRadius: 6, background: 'rgba(245,194,0,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(245,194,0,0.2)', fontSize: 11 }}>{t.type}</span>
                      ))}
                    </div>
                    <strong style={{ color: 'var(--color-text-dim)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em', display: 'block', marginTop: 12 }}>Steps</strong>
                    <pre style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--color-accent)', overflow: 'auto', maxHeight: 120 }}>
                      {JSON.stringify(w.steps, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
