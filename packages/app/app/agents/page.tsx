'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Agent = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  state: string;
  tasksCompleted?: number;
  tasksFailed?: number;
  capabilities?: string[];
};

const BADGE: Record<string, string> = {
  idle: '#52525b',
  running: '#16a34a',
  error: '#dc2626',
  paused: '#ca8a04',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const load = () =>
    fetch('/api/v1/agents')
      .then(r => r.json())
      .then(d => setAgents(d.data ?? []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch('/api/v1/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName('');
    setCreating(false);
    load();
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)' }}>Agents</h1>
          <p style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 4 }}>Manage your AI agents</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
            placeholder="New agent name…"
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              color: 'var(--color-highlight)',
              outline: 'none',
              width: 200,
            }}
          />
          <button
            onClick={create}
            disabled={creating || !newName.trim()}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              background: !newName.trim() ? 'var(--color-border)' : 'var(--color-primary)',
              border: 'none',
              color: !newName.trim() ? 'var(--color-accent)' : '#000',
              fontWeight: 600,
              fontSize: 13,
              cursor: !newName.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            + Create
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
      ) : agents.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No agents yet. Create one above.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {agents.map(a => (
            <div
              key={a.id}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-highlight)' }}>{a.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: BADGE[a.state] ?? '#52525b',
                    color: '#fff',
                    textTransform: 'capitalize',
                  }}
                >
                  {a.state}
                </span>
              </div>
              {a.description && <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 12 }}>{a.description}</p>}
              {a.capabilities && a.capabilities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {a.capabilities.map(c => (
                    <span key={c} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,194,0,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(245,194,0,0.25)' }}>{c}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-dim)' }}>
                <span>✅ {a.tasksCompleted ?? 0} done</span>
                <span>❌ {a.tasksFailed ?? 0} failed</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
