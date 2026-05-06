import { createResource, createSignal, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Observer = {
  id: string
  name: string
  description?: string
  enabled: boolean
  eventCount?: number
}

export default function ObserversPage() {
  const server = useServer()
  const [toggling, setToggling] = createSignal<string | null>(null)

  const [observers, { refetch }] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/observers`).then((r) => r.json() as Promise<Observer[]>)
  })

  const toggle = async (observer: Observer) => {
    setToggling(observer.id)
    const base = server.current?.http.url ?? ""
    await fetch(`${base}/api/v1/observers/${observer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !observer.enabled }),
    }).catch(() => null)
    setToggling(null)
    void refetch()
  }

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Observers</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "32px" }}>Monitor and toggle event observers</p>

      <Switch>
        <Match when={observers.loading}>
          <p style={{ color: "#71717a" }}>Loading…</p>
        </Match>
        <Match when={observers.error}>
          <p style={{ color: "#f87171" }}>Failed to load observers</p>
        </Match>
        <Match when={observers()}>
          <table style={{ width: "100%", "border-collapse": "collapse" }}>
            <thead>
              <tr>
                {(["Name", "Events", "Status", ""] as const).map((h) => (
                  <th style={{ "font-size": "12px", color: "#71717a", "text-transform": "uppercase", "font-weight": "600", "text-align": "left", padding: "8px 12px", "border-bottom": "1px solid #27272a" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <For each={observers()}>
                {(obs) => (
                  <tr style={{ "border-bottom": "1px solid #27272a" }}>
                    <td style={{ padding: "10px 12px", "font-size": "14px", color: "white" }}>
                      {obs.name}
                      <Show when={obs.description}>
                        <div style={{ "font-size": "12px", color: "#71717a" }}>{obs.description}</div>
                      </Show>
                    </td>
                    <td style={{ padding: "10px 12px", color: "#a1a1aa" }}>{obs.eventCount ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "12px", "font-weight": "500", display: "inline-block", background: obs.enabled ? "#16a34a" : "#3f3f46", color: "white" }}>
                        {obs.enabled ? "enabled" : "disabled"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        type="button"
                        disabled={toggling() === obs.id}
                        onClick={() => toggle(obs)}
                        style={{ background: "transparent", border: "1px solid #27272a", "border-radius": "6px", padding: "4px 12px", "font-size": "13px", color: "#a1a1aa", cursor: "pointer" }}
                      >
                        {toggling() === obs.id ? "…" : obs.enabled ? "Disable" : "Enable"}
                      </button>
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
