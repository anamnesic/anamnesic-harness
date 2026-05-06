'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Plugin = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  sdkVersion?: string;
  enabled?: boolean;
  category?: string;
};

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try a few possible plugin endpoints
    fetch('/api/v1/extensions/open-vsx/search?query=kairos+plugin&size=24')
      .then(r => r.json())
      .then(d => {
        const exts = d.data?.extensions ?? [];
        setPlugins(exts.map((e: Record<string, unknown>) => ({
          id: `${e.namespace}.${e.name}`,
          name: (e.displayName as string) ?? (e.name as string),
          description: e.description as string,
          version: e.version as string,
          author: e.namespace as string,
        })));
      })
      .catch(() => setPlugins([]))
      .finally(() => setLoading(false));
  }, []);

  // Built-in plugin categories pulled from extensions/ folder names
  const BUILTIN_CATEGORIES = [
    'AI Assistants', 'Code Tools', 'Data & Analytics', 'DevOps',
    'Communication', 'Productivity', 'Security', 'Integration',
  ];

  return (
    <DashboardLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)', marginBottom: 6 }}>Plugins</h1>
      <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 28 }}>
        Kairos SDK v1/v2 plugins — extend agent capabilities
      </p>

      {/* SDK info */}
      <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>SDK Version</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>v2.0</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Extensions</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-highlight)' }}>128+</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Categories</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-highlight)' }}>{BUILTIN_CATEGORIES.length}</div>
          </div>
        </div>
      </div>

      {/* categories */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Browse Categories
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {BUILTIN_CATEGORIES.map(cat => (
            <div
              key={cat}
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--color-highlight)' }}
            >
              {cat}
            </div>
          ))}
        </div>
      </section>

      {/* marketplace results */}
      <section>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          Open VSX — Kairos Plugins
        </h2>
        {loading ? (
          <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
        ) : plugins.length === 0 ? (
          <p style={{ color: 'var(--color-text-dim)' }}>No marketplace plugins found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {plugins.map(p => (
              <div key={p.id} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-highlight)', marginBottom: 4 }}>{p.name}</div>
                {p.author && <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 8 }}>by {p.author}{p.version ? ` · v${p.version}` : ''}</div>}
                {p.description && <p style={{ fontSize: 12, color: 'var(--color-accent)', lineHeight: 1.5 }}>{p.description.slice(0, 100)}{p.description.length > 100 ? '…' : ''}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
