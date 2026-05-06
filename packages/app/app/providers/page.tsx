'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Capability = { provider: string; model?: string; taskType?: string };
type CapabilityMatrix = Record<string, string[]>;

export default function ProvidersPage() {
  const [matrix, setMatrix] = useState<CapabilityMatrix>({});
  const [routingConfig, setRoutingConfig] = useState<Record<string, unknown>>({});
  const [resolvedDefaults, setResolvedDefaults] = useState<Record<string, Capability>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/inference/capabilities')
      .then(r => r.json())
      .then(d => {
        setMatrix(d.data?.matrix ?? {});
        setRoutingConfig(d.data?.routingConfig ?? {});
        setResolvedDefaults(d.data?.resolvedDefaults ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  const providers = Object.keys(matrix);

  return (
    <DashboardLayout>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)', marginBottom: 6 }}>LLM Providers</h1>
      <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 28 }}>
        {providers.length} providers configured — routing rules and capabilities
      </p>

      {loading ? <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p> : (
        <>
          {/* resolved defaults */}
          {Object.keys(resolvedDefaults).length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Task Routing Defaults
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
                {Object.entries(resolvedDefaults).map(([task, cap]) => (
                  <div key={task} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{task}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>{cap.provider}</div>
                    {cap.model && <div style={{ fontSize: 12, color: 'var(--color-accent)', marginTop: 2 }}>{cap.model}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* capability matrix */}
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              Provider Capability Matrix
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--color-text-dim)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)' }}>Provider</th>
                    <th style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--color-text-dim)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', background: 'var(--color-card)' }}>Capabilities</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, i) => (
                    <tr key={p} style={{ background: i % 2 === 0 ? 'var(--color-card)' : 'transparent' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--color-highlight)', fontWeight: 500, borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>{p}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(matrix[p] ?? []).map(c => (
                            <span key={c} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,194,0,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(245,194,0,0.2)' }}>{c}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* routing config */}
          {Object.keys(routingConfig).length > 0 && (
            <section>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Routing Config (JSON)
              </h2>
              <pre style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16, fontSize: 12, color: 'var(--color-accent)', overflow: 'auto', maxHeight: 240 }}>
                {JSON.stringify(routingConfig, null, 2)}
              </pre>
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
