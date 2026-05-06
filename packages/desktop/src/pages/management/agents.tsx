import { createResource, createMemo, createSignal, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Agent = {
  id: string
  name: string
  description?: string
  isActive: boolean
  state: string
  tasksCompleted?: number
  tasksFailed?: number
  capabilities?: string[]
}

const stateColor: Record<string, string> = {
  idle: "#52525b",
  running: "#16a34a",
  error: "#dc2626",
  paused: "#ca8a04",
}

export default function AgentsPage() {
  const server = useServer()
  const [search, setSearch] = createSignal("")

  const [agents] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/agents`).then((r) => r.json() as Promise<Agent[]>)
  })

  const filtered = createMemo(() => {
    const q = search().toLowerCase()
    return (agents() ?? []).filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "var(--text-base)" }}>Agents</h1>
      <p style={{ "font-size": "14px", color: "var(--text-weak)", "margin-bottom": "24px" }}>Manage and monitor running agents</p>

      <input
        type="text"
        placeholder="Search agents…"
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
        style={{ background: "var(--surface-raised-base, var(--surface-base))", border: "1px solid var(--border-base)", "border-radius": "6px", padding: "8px 12px", color: "var(--text-base)", "font-size": "14px", width: "300px", "margin-bottom": "24px", display: "block" }}
      />

      <Switch>
        <Match when={agents.loading}>
          <p style={{ color: "var(--text-weak)" }}>Loading…</p>
        </Match>
        <Match when={agents.error}>
          <p style={{ color: "var(--text-critical-base, #dc2626)" }}>Failed to load agents</p>
        </Match>
        <Match when={agents()}>
          <table style={{ width: "100%", "border-collapse": "collapse" }}>
            <thead>
              <tr>
                {(["ID", "Name", "State", "Active", "Tasks ✓", "Tasks ✗"] as const).map((h) => (
                  <th style={{ "font-size": "12px", color: "var(--text-weak)", "text-transform": "uppercase", "font-weight": "600", "text-align": "left", padding: "8px 12px", "border-bottom": "1px solid var(--border-base)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <For each={filtered()}>
                {(agent) => (
                  <tr style={{ "border-bottom": "1px solid var(--border-base)" }}>
                    <td style={{ padding: "10px 12px", "font-size": "13px", color: "var(--text-weak)", "font-family": "monospace" }}>{agent.id}</td>
                    <td style={{ padding: "10px 12px", "font-size": "14px", color: "var(--text-base)" }}>
                      {agent.name}
                      <Show when={agent.description}>
                        <div style={{ "font-size": "12px", color: "var(--text-weak)" }}>{agent.description}</div>
                      </Show>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "12px", "font-weight": "500", display: "inline-block", background: stateColor[agent.state] ?? "#52525b", color: "var(--text-base)" }}>
                        {agent.state}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "12px", "font-weight": "500", display: "inline-block", background: agent.isActive ? "#16a34a" : "#3f3f46", color: "var(--text-base)" }}>
                        {agent.isActive ? "active" : "inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text-weak)" }}>{agent.tasksCompleted ?? "—"}</td>
                    <td style={{ padding: "10px 12px", color: agent.tasksFailed ? "var(--text-critical-base, #dc2626)" : "var(--text-weak)" }}>{agent.tasksFailed ?? "—"}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
          <Show when={filtered().length === 0}>
            <p style={{ color: "var(--text-weak)", "margin-top": "16px" }}>No agents found.</p>
          </Show>
        </Match>
      </Switch>
    </div>
  )
}
