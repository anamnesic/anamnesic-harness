'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Observer = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  lastTriggeredAt?: string;
  triggerCount?: number;
  description?: string;
};

type ObserverEvent = { id: string; observerId: string; type: string; data: unknown; createdAt: string };

export default function ObserversPage() {
  const [observers, setObservers] = useState<Observer[]>([]);
  const [events, setEvents] = useState<ObserverEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch('/api/v1/observers')
      .then(r => r.json())
      .then(d => setObservers(d.data?.observers ?? []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/v1/observers/events?observerId=${selected}&limit=20`)
      .then(r => r.json())
      .then(d => setEvents(d.data?.events ?? []));
  }, [selected]);

  const toggle = async (id: string, active: boolean) => {
    await fetch('/api/v1/observers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    load();
  };

  return (
    <DashboardLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)', marginBottom: 6 }}>Observers</h1>
      <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 28 }}>System watchers and monitoring rules</p>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* observer list */}
        <div>
          {loading ? (
            <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
          ) : observers.length === 0 ? (
            <p style={{ color: 'var(--color-text-dim)' }}>No observers registered.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {observers.map(o => (
                <div
                  key={o.id}
                  onClick={() => setSelected(selected === o.id ? null : o.id)}
                  style={{
                    background: selected === o.id ? 'rgba(245,194,0,0.08)' : 'var(--color-card)',
                    border: `1px solid ${selected === o.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 10,
                    padding: '14px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-highlight)', marginBottom: 3 }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                      {o.type} {o.triggerCount ? `· ${o.triggerCount} triggers` : ''}
                      {o.lastTriggeredAt ? ` · last: ${new Date(o.lastTriggeredAt).toLocaleString()}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); toggle(o.id, o.active); }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: o.active ? 'rgba(22,163,74,0.15)' : 'var(--color-border)',
                      color: o.active ? '#16a34a' : 'var(--color-text-dim)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {o.active ? 'Active' : 'Paused'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* event feed */}
        {selected && (
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Recent Events
            </h2>
            {events.length === 0 ? (
              <p style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>No events recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {events.map(ev => (
                  <div key={ev.id} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-highlight)' }}>{ev.type}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{new Date(ev.createdAt).toLocaleString()}</span>
                    </div>
                    <pre style={{ fontSize: 11, color: 'var(--color-accent)', margin: 0, overflow: 'auto', maxHeight: 80 }}>
                      {JSON.stringify(ev.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
