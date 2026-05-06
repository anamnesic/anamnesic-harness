'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Webhook = {
  id: string;
  name: string;
  url: string;
  type: string;
  events?: string[];
  enabled: boolean;
  createdAt?: string;
};

const CHANNEL_TYPES = ['discord', 'slack', 'telegram', 'whatsapp', 'email', 'webhook', 'sms', 'teams', 'matrix', 'signal', 'other'];

export default function ChannelsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', url: '', type: 'webhook', events: '' });
  const [creating, setCreating] = useState(false);

  const load = () =>
    fetch('/api/v1/integrations')
      .then(r => r.json())
      .then(d => setWebhooks(d.data ?? []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name.trim() || !form.url.trim()) return;
    setCreating(true);
    await fetch('/api/v1/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        url: form.url.trim(),
        type: form.type,
        events: form.events.split(',').map(e => e.trim()).filter(Boolean),
        enabled: true,
      }),
    });
    setForm({ name: '', url: '', type: 'webhook', events: '' });
    setCreating(false);
    load();
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/v1/integrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    load();
  };

  return (
    <DashboardLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)', marginBottom: 6 }}>Channels</h1>
      <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 28 }}>Connect messaging channels and webhooks</p>

      {/* create form */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px', marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
          Add Channel
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none' }} />
          <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="Webhook URL" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none' }} />
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none' }}>
            {CHANNEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={form.events} onChange={e => setForm(f => ({ ...f, events: e.target.value }))} placeholder="Events (comma-separated)" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none' }} />
        </div>
        <button
          onClick={create}
          disabled={creating || !form.name.trim() || !form.url.trim()}
          style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, background: (!form.name.trim() || !form.url.trim()) ? 'var(--color-border)' : 'var(--color-primary)', border: 'none', color: (!form.name.trim() || !form.url.trim()) ? 'var(--color-accent)' : '#000', fontWeight: 600, fontSize: 13, cursor: (!form.name.trim() || !form.url.trim()) ? 'not-allowed' : 'pointer' }}
        >
          + Add Channel
        </button>
      </div>

      {/* list */}
      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
      ) : webhooks.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No channels connected yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {webhooks.map(w => (
            <div key={w.id} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-highlight)' }}>{w.name}</span>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 99, background: 'rgba(245,194,0,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(245,194,0,0.2)', textTransform: 'capitalize' }}>{w.type}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', wordBreak: 'break-all' }}>{w.url}</div>
                {w.events && w.events.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {w.events.map(e => <span key={e} style={{ fontSize: 11, color: 'var(--color-accent)' }}>#{e}</span>)}
                  </div>
                )}
              </div>
              <button
                onClick={() => toggle(w.id, w.enabled)}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: w.enabled ? 'rgba(22,163,74,0.15)' : 'var(--color-border)', color: w.enabled ? '#16a34a' : 'var(--color-text-dim)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
              >
                {w.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
