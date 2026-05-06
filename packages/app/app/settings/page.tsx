'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '../_components/DashboardLayout';

type Settings = {
  flags: Record<string, boolean>;
  aiSettings: Record<string, string | number | boolean>;
  workspaceId: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [patch, setPatch] = useState<Record<string, string | boolean>>({});

  useEffect(() => {
    fetch('/api/v1/settings')
      .then(r => r.json())
      .then(d => setSettings(d.data))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch('/api/v1/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-highlight)' }}>Settings</h1>
          <p style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 4 }}>Workspace configuration and AI provider settings</p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--color-text-dim)' }}>Loading…</p>
        ) : settings ? (
          <>
            {/* Feature Flags */}
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                Feature Flags
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(settings.flags).map(([key, val]) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 14, color: 'var(--color-highlight)', fontFamily: 'monospace' }}>{key}</span>
                    <input
                      type="checkbox"
                      defaultChecked={val}
                      onChange={e => setPatch(p => ({ ...p, [`flags.${key}`]: e.target.checked }))}
                      style={{ accentColor: 'var(--color-primary)', width: 16, height: 16 }}
                    />
                  </label>
                ))}
                {Object.keys(settings.flags).length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>No feature flags configured.</p>
                )}
              </div>
            </section>

            {/* AI Provider Settings */}
            <section style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                AI Providers
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(settings.aiSettings).map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 6, fontFamily: 'monospace' }}>{key}</div>
                    <input
                      defaultValue={String(val)}
                      type={key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') ? 'password' : 'text'}
                      onChange={e => setPatch(p => ({ ...p, [key]: e.target.value }))}
                      style={{
                        width: '100%',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        padding: '7px 10px',
                        fontSize: 13,
                        color: 'var(--color-highlight)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
                {Object.keys(settings.aiSettings).length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>No AI provider settings found.</p>
                )}
              </div>
            </section>

            <button
              onClick={save}
              disabled={saving || Object.keys(patch).length === 0}
              style={{
                padding: '10px 28px',
                borderRadius: 8,
                background: saved ? '#16a34a' : Object.keys(patch).length === 0 ? 'var(--color-border)' : 'var(--color-primary)',
                border: 'none',
                color: Object.keys(patch).length === 0 && !saved ? 'var(--color-accent)' : '#000',
                fontWeight: 600,
                fontSize: 14,
                cursor: Object.keys(patch).length === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        ) : (
          <p style={{ color: 'var(--color-text-dim)' }}>Failed to load settings.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
