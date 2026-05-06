'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Secret = { key: string; description?: string; createdAt?: string; updatedAt?: string };

export default function VaultPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const load = () =>
    fetch('/api/v1/vault')
      .then(r => r.json())
      .then(d => setSecrets(d.data?.secrets ?? d.data ?? []))
      .catch(() => setSecrets([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const write = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/v1/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: newKey.trim(), value: newValue.trim(), description: newDesc.trim() }),
    });
    if (res.ok) {
      setSaved(newKey.trim());
      setNewKey('');
      setNewValue('');
      setNewDesc('');
      setTimeout(() => setSaved(''), 2000);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message ?? 'Failed to save secret');
    }
    setSaving(false);
  };

  const revoke = async (key: string) => {
    if (!confirm(`Revoke secret "${key}"?`)) return;
    await fetch(`/api/v1/vault/${encodeURIComponent(key)}`, { method: 'DELETE' });
    load();
  };

  return (
    <DashboardLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)', marginBottom: 6 }}>Vault</h1>
      <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 28 }}>AES-256-GCM encrypted secrets manager</p>

      {/* write new secret */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Store Secret
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Key (e.g. OPENAI_API_KEY)" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none' }} />
          <input value={newValue} onChange={e => setNewValue(e.target.value)} type="password" placeholder="Secret value" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none' }} />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none' }} />
        </div>
        {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{error}</p>}
        <button
          onClick={write}
          disabled={saving || !newKey.trim() || !newValue.trim()}
          style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, background: saved ? '#16a34a' : (!newKey.trim() || !newValue.trim()) ? 'var(--color-border)' : 'var(--color-primary)', border: 'none', color: (!newKey.trim() || !newValue.trim()) && !saved ? 'var(--color-accent)' : '#000', fontWeight: 600, fontSize: 13, cursor: (!newKey.trim() || !newValue.trim()) ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
        >
          {saved ? `✓ Stored ${saved}` : saving ? 'Storing…' : '🔒 Store Secret'}
        </button>
      </div>

      {/* secret list */}
      <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
        Stored Secrets
      </h2>
      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
      ) : secrets.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No secrets stored.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {secrets.map(s => (
            <div key={s.key} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-highlight)', fontFamily: 'monospace' }}>🔑 {s.key}</div>
                {s.description && <div style={{ fontSize: 12, color: 'var(--color-accent)', marginTop: 2 }}>{s.description}</div>}
                {s.updatedAt && <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginTop: 2 }}>Updated {new Date(s.updatedAt).toLocaleString()}</div>}
              </div>
              <button
                onClick={() => revoke(s.key)}
                style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'rgba(220,38,38,0.1)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
