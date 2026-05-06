'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Skill = {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  capabilities: string[];
  use_for: string[];
};

const CATEGORY_COLORS: Record<string, string> = {
  coding: '#3b82f6',
  reasoning: '#8b5cf6',
  research: '#06b6d4',
  security: '#ef4444',
  data: '#f59e0b',
  writing: '#10b981',
  devops: '#f97316',
  agentic: '#ec4899',
  analysis: '#6366f1',
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filter, setFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/skills')
      .then(r => r.json())
      .then(d => setSkills(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(skills.map(s => s.category))).sort();
  const filtered = skills.filter(s => {
    const q = filter.toLowerCase();
    return (
      (!catFilter || s.category === catFilter) &&
      (!q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    );
  });

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)' }}>Skills</h1>
        <p style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 4 }}>
          {skills.length} internal Kairos skills across {categories.length} categories
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search skills…"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            color: 'var(--color-highlight)',
            outline: 'none',
            width: 220,
          }}
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 13,
            color: 'var(--color-highlight)',
            outline: 'none',
          }}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(s => (
            <div
              key={s.id}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '18px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-highlight)' }}>{s.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: `${CATEGORY_COLORS[s.category] ?? '#52525b'}22`,
                    color: CATEGORY_COLORS[s.category] ?? '#a1a1aa',
                    border: `1px solid ${CATEGORY_COLORS[s.category] ?? '#52525b'}44`,
                    textTransform: 'capitalize',
                  }}
                >
                  {s.category}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-accent)', marginBottom: 10, lineHeight: 1.5 }}>{s.description}</p>
              {s.capabilities?.slice(0, 3).map(c => (
                <span key={c} style={{ marginRight: 6, fontSize: 11, color: 'var(--color-text-dim)' }}>• {c}</span>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: 'var(--color-text-dim)', gridColumn: '1/-1' }}>No skills match your search.</p>}
        </div>
      )}
    </DashboardLayout>
  );
}
