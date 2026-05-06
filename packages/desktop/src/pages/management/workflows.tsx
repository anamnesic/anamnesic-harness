import { createResource, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Workflow = {
  id: string
  name: string
  description?: string
  status: string
  steps?: number
  lastRunAt?: string
}

const statusColor: Record<string, string> = {
  active: "#16a34a",
  running: "#2563eb",
  paused: "#ca8a04",
  error: "#dc2626",
  idle: "#52525b",
}

export default function WorkflowsPage() {
  const server = useServer()

  const [workflows] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/workflows`).then((r) => r.json() as Promise<Workflow[]>)
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "var(--text-base)" }}>Workflows</h1>
      <p style={{ "font-size": "14px", color: "var(--text-weak)", "margin-bottom": "32px" }}>Manage automation workflows</p>

      <Switch>
        <Match when={workflows.loading}>
          <p style={{ color: "var(--text-weak)" }}>Loading…</p>
        </Match>
        <Match when={workflows.error}>
          <p style={{ color: "var(--text-critical-base, #dc2626)" }}>Failed to load workflows</p>
        </Match>
        <Match when={workflows()}>
          <table style={{ width: "100%", "border-collapse": "collapse" }}>
            <thead>
              <tr>
                {(["Name", "Status", "Steps", "Last Run"] as const).map((h) => (
                  <th style={{ "font-size": "12px", color: "var(--text-weak)", "text-transform": "uppercase", "font-weight": "600", "text-align": "left", padding: "8px 12px", "border-bottom": "1px solid var(--border-base)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <For each={workflows()}>
                {(wf) => (
                  <tr style={{ "border-bottom": "1px solid var(--border-base)" }}>
                    <td style={{ padding: "10px 12px", "font-size": "14px", color: "var(--text-base)" }}>
                      {wf.name}
                      <Show when={wf.description}>
                        <div style={{ "font-size": "12px", color: "var(--text-weak)" }}>{wf.description}</div>
                      </Show>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "12px", "font-weight": "500", display: "inline-block", background: statusColor[wf.status] ?? "#52525b", color: "var(--text-base)" }}>
                        {wf.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text-weak)" }}>{wf.steps ?? "—"}</td>
                    <td style={{ padding: "10px 12px", "font-size": "13px", color: "var(--text-weak)" }}>
                      {wf.lastRunAt ? new Date(wf.lastRunAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Match>
      </Switch>
    </div>
  )
}
