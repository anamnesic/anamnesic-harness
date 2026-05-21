import { For, type ParentProps } from "solid-js"
import { A, useLocation } from "@solidjs/router"

const NAV = [
  { href: "/management/dashboard", label: "Dashboard", icon: "⬡" },
  { href: "/management/agents", label: "Agents", icon: "🤖" },
  { href: "/management/projects", label: "Projects", icon: "📁" },
  { href: "/management/workflows", label: "Workflows", icon: "⚙️" },
  { href: "/management/skills", label: "Skills", icon: "⚡" },
  { href: "/management/tools", label: "Tools", icon: "🔧" },
  { href: "/management/extensions", label: "Extensions", icon: "🧩" },
  { href: "/management/plugins", label: "Plugins", icon: "🔌" },
  { href: "/management/providers", label: "Providers", icon: "🧠" },
  { href: "/management/channels", label: "Channels", icon: "📡" },
  { href: "/management/memory", label: "Memory", icon: "🗄️" },
  { href: "/management/observers", label: "Observers", icon: "👁️" },
  { href: "/management/vault", label: "Vault", icon: "🔒" },
  { href: "/management/settings", label: "Settings", icon: "⚙️" },
]

export default function ManagementLayout(props: ParentProps) {
  const loc = useLocation()

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--background-base)", color: "var(--text-base)", overflow: "hidden" }}>
      <nav
        style={{
          width: "220px",
          background: "var(--surface-raised-base, var(--surface-base))",
          borderRight: "1px solid var(--border-base)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 8px",
          gap: "4px",
          "overflow-y": "auto",
          "flex-shrink": "0",
        }}
      >
        <div
          style={{
            padding: "0 8px 16px",
            fontSize: "13px",
            fontWeight: "700",
            color: "var(--text-base)",
            "letter-spacing": "0.1em",
            "text-transform": "uppercase",
          }}
        >
          Management
        </div>
        <For each={NAV}>
          {(item) => {
            const active = () => loc.pathname === item.href || loc.pathname.startsWith(item.href + "/")
            return (
              <A
                href={item.href}
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "8px",
                  padding: "8px 10px",
                  "border-radius": "6px",
                  "font-size": "14px",
                  "text-decoration": "none",
                  color: active() ? "var(--text-base)" : "var(--text-weak)",
                  background: active() ? "var(--surface-base)" : "transparent",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span style={{ "font-size": "16px" }}>{item.icon}</span>
                {item.label}
              </A>
            )
          }}
        </For>
        <div style={{ "margin-top": "auto", "padding-top": "16px" }}>
          <A
            href="/"
            style={{
              display: "flex",
              "align-items": "center",
              gap: "8px",
              padding: "8px 10px",
              "border-radius": "6px",
              "font-size": "13px",
              color: "var(--text-weak)",
              "text-decoration": "none",
            }}
          >
            ← Back to App
          </A>
        </div>
      </nav>
      <main style={{ flex: "1", "overflow-y": "auto", padding: "32px 40px" }}>{props.children}</main>
    </div>
  )
}
