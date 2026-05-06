'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Project = {
  id: string;
  name: string;
  path?: string;
  description?: string;
  workspaceId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () =>
    fetch('/api/v1/projects')
      .then(r => r.json())
      .then(d => setProjects(d.data ?? []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), path: newPath.trim() || undefined }),
    });
    setNewName('');
    setNewPath('');
    setCreating(false);
    load();
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)' }}>Projects</h1>
          <p style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 4 }}>{projects.length} projects</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Project name…"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none', width: 180 }}
          />
          <input
            value={newPath}
            onChange={e => setNewPath(e.target.value)}
            placeholder="/path/to/project (optional)"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none', width: 220 }}
          />
          <button
            onClick={create}
            disabled={creating || !newName.trim()}
            style={{ padding: '8px 18px', borderRadius: 8, background: !newName.trim() ? 'var(--color-border)' : 'var(--color-primary)', border: 'none', color: !newName.trim() ? 'var(--color-accent)' : '#000', fontWeight: 600, fontSize: 13, cursor: !newName.trim() ? 'not-allowed' : 'pointer' }}
          >
            + Create
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
      ) : projects.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No projects yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {projects.map(p => (
            <div key={p.id} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-highlight)', marginBottom: 6 }}>{p.name}</div>
              {p.path && (
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', fontFamily: 'monospace', marginBottom: 8, wordBreak: 'break-all' }}>{p.path}</div>
              )}
              {p.description && (
                <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 10, lineHeight: 1.5 }}>{p.description}</p>
              )}
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                {p.createdAt ? `Created ${new Date(p.createdAt).toLocaleDateString()}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
