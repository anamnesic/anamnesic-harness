'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Extension = {
  namespace: string;
  name: string;
  displayName?: string;
  description?: string;
  version?: string;
  averageRating?: number;
  downloadCount?: number;
  categories?: string[];
};

export default function ExtensionsPage() {
  const [results, setResults] = useState<Extension[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const search = (q: string) => {
    setLoading(true);
    fetch(`/api/v1/extensions/open-vsx/search?query=${encodeURIComponent(q)}&size=24`)
      .then(r => r.json())
      .then(d => { setResults(d.data?.extensions ?? []); setTotal(d.data?.totalSize ?? 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { search(''); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); search(query); };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)' }}>Extensions</h1>
        <p style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 4 }}>
          Open VSX registry — {total.toLocaleString()} extensions available
        </p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search extensions…"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            color: 'var(--color-highlight)',
            outline: 'none',
            width: 300,
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: 'var(--color-primary)',
            border: 'none',
            color: '#000',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>

      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Searching…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
          {results.map(ext => (
            <div
              key={`${ext.namespace}.${ext.name}`}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '16px 18px',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-highlight)', marginBottom: 4 }}>
                {ext.displayName ?? ext.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 8 }}>
                {ext.namespace}.{ext.name} {ext.version ? `v${ext.version}` : ''}
              </div>
              {ext.description && (
                <p style={{ fontSize: 12, color: 'var(--color-accent)', lineHeight: 1.5, marginBottom: 10 }}>
                  {ext.description.slice(0, 120)}{ext.description.length > 120 ? '…' : ''}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-dim)' }}>
                {ext.averageRating != null && <span>⭐ {ext.averageRating.toFixed(1)}</span>}
                {ext.downloadCount != null && <span>⬇ {ext.downloadCount.toLocaleString()}</span>}
              </div>
            </div>
          ))}
          {results.length === 0 && !loading && <p style={{ color: 'var(--color-text-dim)', gridColumn: '1/-1' }}>No extensions found.</p>}
        </div>
      )}
    </DashboardLayout>
  );
}
