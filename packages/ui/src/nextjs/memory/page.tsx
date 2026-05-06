'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type MemoryEntry = {
  id: string;
  content: string;
  score?: number;
  source?: string;
  createdAt?: string;
};

export default function MemoryPage() {
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('system');
  const [results, setResults] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch('/api/v1/recall/reranked', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), projectId, tokenBudget: 3000 }),
    });
    const data = await res.json();
    setResults(data.data?.results ?? data.data?.entries ?? []);
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)', marginBottom: 6 }}>Memory</h1>
      <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 28 }}>Semantic recall — search the agent's long-term memory</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <input
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          placeholder="Project ID"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none', width: 160 }}
        />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search memory…"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--color-highlight)', outline: 'none', flex: 1, minWidth: 220 }}
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          style={{ padding: '8px 18px', borderRadius: 8, background: !query.trim() ? 'var(--color-border)' : 'var(--color-primary)', border: 'none', color: !query.trim() ? 'var(--color-accent)' : '#000', fontWeight: 600, fontSize: 13, cursor: !query.trim() ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '…' : 'Recall'}
        </button>
      </div>

      {!searched ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', marginTop: 60, fontSize: 14 }}>
          Enter a query to search agent memory across embeddings and summaries.
        </div>
      ) : loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Searching…</p>
      ) : results.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>No memories found for that query.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginBottom: 4 }}>{results.length} results</p>
          {results.map((r, i) => (
            <div key={r.id ?? i} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                {r.score != null && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,194,0,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(245,194,0,0.2)' }}>
                    score {r.score.toFixed(3)}
                  </span>
                )}
                {r.source && <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{r.source}</span>}
                {r.createdAt && <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{new Date(r.createdAt).toLocaleString()}</span>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-accent)', lineHeight: 1.6, margin: 0 }}>{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
