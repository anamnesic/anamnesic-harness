"use client"

import { useEffect, useState } from "react"
import { Activity, Server, Cpu, Database, Layers, Users, ArrowLeft, Globe } from "lucide-react"
import Link from "next/link"

interface Health {
  healthy: boolean
  version: string
  uptime: number
}

interface Provider {
  id: string
  name: string
  status: string
  models: number
}

interface Session {
  id: string
  title: string
  provider: string
  model: string
  messageCount: number
  createdAt: string
}

export default function Dashboard() {
  const [health, setHealth] = useState<Health | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/health").then((r) => r.json()),
      fetch("/api/providers").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
    ]).then(([h, p, s]) => {
      setHealth(h)
      setProviders(p.providers ?? [])
      setSessions(s.sessions ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-6 rounded-full border-2 border-border border-t-text-strong animate-spin" />
      </div>
    )
  }

  const statCards = [
    { icon: Server, label: "Server Status", value: health?.healthy ? "Healthy" : "Unhealthy", color: health?.healthy ? "text-green-600" : "text-red-600" },
    { icon: Layers, label: "Providers", value: providers.length.toString() },
    { icon: Database, label: "Active Sessions", value: sessions.length.toString() },
    { icon: Cpu, label: "Version", value: health?.version ?? "—" },
  ]

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-text-weak hover:text-text-strong transition-colors">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-bg-strong flex items-center justify-center">
              <span className="text-bg-primary font-semibold text-sm">K</span>
            </div>
            <span className="text-text-strong font-medium">Dashboard</span>
          </div>
        </div>
        <span className="text-xs text-text-weak font-mono">
          <Activity className="size-3 inline mr-1" />
          live
        </span>
      </header>

      <main className="px-6 py-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((c) => (
            <div key={c.label} className="p-4 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className="size-4 text-text-weak" />
                <span className="text-xs text-text-weak">{c.label}</span>
              </div>
              <span className={`text-lg font-medium ${c.color ?? "text-text-strong"}`}>{c.value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="size-4 text-text-weak" />
              <h2 className="text-sm font-medium text-text-strong">Providers</h2>
            </div>
            <div className="rounded-xl border border-border divide-y divide-border">
              {providers.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${p.status === "active" ? "bg-green-500" : "bg-yellow-400"}`} />
                    <span className="text-sm text-text-strong">{p.name}</span>
                  </div>
                  <span className="text-xs text-text-weak">{p.models} models</span>
                </div>
              ))}
              {providers.length > 8 && (
                <div className="px-4 py-2 text-xs text-text-weak text-center">
                  +{providers.length - 8} more
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-4 text-text-weak" />
              <h2 className="text-sm font-medium text-text-strong">Recent Sessions</h2>
            </div>
            <div className="rounded-xl border border-border divide-y divide-border">
              {sessions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-text-weak">No active sessions</div>
              ) : (
                sessions.slice(0, 6).map((s) => (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-text-strong truncate max-w-[200px]">{s.title}</span>
                      <span className="text-xs text-text-weak font-mono">{s.messageCount} msgs</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-weak">
                      <span>{s.provider}</span>
                      <span>·</span>
                      <span>{s.model}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
