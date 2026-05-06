'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/agents', label: 'Agents', icon: '🤖' },
  { href: '/skills', label: 'Skills', icon: '⚡' },
  { href: '/tools', label: 'Tools', icon: '🔧' },
  { href: '/extensions', label: 'Extensions', icon: '🧩' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: 'var(--color-card)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
          ⬡ Kairos
        </span>
      </div>
      <nav style={{ flex: 1, marginTop: 12 }}>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--color-highlight)' : 'var(--color-accent)',
                background: active ? 'rgba(245,194,0,0.1)' : 'transparent',
                borderLeft: active ? '3px solid var(--color-primary)' : '3px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={toggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            background: 'var(--color-border)',
            border: 'none',
            borderRadius: 8,
            padding: '8px 12px',
            color: 'var(--color-accent)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
    </aside>
  );
}
