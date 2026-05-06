'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Metrics = {
  uptimeDays: number;
  uptimeHours: number;
  memUsedMb: number;
  memTotalMb: number;
  cpuLoad: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
};

type AgentStats = {
  totalAgents: number;
  activeAgents: number;
  totalTasksCompleted: number;
  totalTasksFailed: number;
};

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: `1px solid ${accent ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? 'var(--color-primary)' : 'var(--color-highlight)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);

  useEffect(() => {
    fetch('/api/v1/metrics').then(r => r.json()).then(d => setMetrics(d.data));
    fetch('/api/v1/agents/stats').then(r => r.json()).then(d => setAgentStats(d.data));
  }, []);

  return (
    <DashboardLayout>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--color-highlight)' }}>Dashboard</h1>
      <p style={{ fontSize: 14, color: 'var(--color-accent)', marginBottom: 32 }}>
        System overview and live metrics
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          System
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard label="Uptime" value={metrics ? `${metrics.uptimeDays}d ${metrics.uptimeHours % 24}h` : '—'} />
          <StatCard label="Memory Used" value={metrics ? `${metrics.memUsedMb} MB` : '—'} sub={metrics ? `of ${metrics.memTotalMb} MB` : undefined} />
          <StatCard label="CPU Load" value={metrics ? `${(metrics.cpuLoad * 100).toFixed(1)}%` : '—'} />
          <StatCard label="Total Requests" value={metrics?.totalRequests ?? '—'} />
          <StatCard label="Error Rate" value={metrics ? `${(metrics.errorRate * 100).toFixed(2)}%` : '—'} accent={(metrics?.errorRate ?? 0) > 0.05} />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Agents
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <StatCard label="Total Agents" value={agentStats?.totalAgents ?? '—'} />
          <StatCard label="Active Now" value={agentStats?.activeAgents ?? '—'} accent={!!agentStats?.activeAgents} />
          <StatCard label="Tasks Completed" value={agentStats?.totalTasksCompleted ?? '—'} />
          <StatCard label="Tasks Failed" value={agentStats?.totalTasksFailed ?? '—'} />
        </div>
      </section>
    </DashboardLayout>
  );
}
