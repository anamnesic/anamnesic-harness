import { createResource, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Provider = {
  id: string
  name: string
  enabled: boolean
  models?: string[]
  type?: string
}

export default function ProvidersPage() {
  const server = useServer()

  const [providers] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/providers`).then((r) => r.json() as Promise<Provider[]>).catch(() =>
      fetch(`${base}/api/v1/inference/capabilities`).then((r) => r.json() as Promise<Provider[]>),
    )
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Providers</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "32px" }}>AI inference providers and capabilities</p>

      <Switch>
        <Match when={providers.loading}>
          <p style={{ color: "#71717a" }}>Loading…</p>
        </Match>
        <Match when={providers.error}>
          <p style={{ color: "#f87171" }}>Failed to load providers</p>
        </Match>
        <Match when={providers()}>
          <table style={{ width: "100%", "border-collapse": "collapse" }}>
            <thead>
              <tr>
                {(["Name", "Type", "Models", "Status"] as const).map((h) => (
                  <th style={{ "font-size": "12px", color: "#71717a", "text-transform": "uppercase", "font-weight": "600", "text-align": "left", padding: "8px 12px", "border-bottom": "1px solid #27272a" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <For each={providers()}>
                {(p) => (
                  <tr style={{ "border-bottom": "1px solid #27272a" }}>
                    <td style={{ padding: "10px 12px", "font-size": "14px", color: "white" }}>{p.name}</td>
                    <td style={{ padding: "10px 12px", "font-size": "13px", color: "#a1a1aa" }}>{p.type ?? "—"}</td>
                    <td style={{ padding: "10px 12px", "font-size": "13px", color: "#a1a1aa" }}>
                      <Show when={p.models?.length}>
                        <span title={p.models!.join(", ")}>{p.models!.length} model{p.models!.length !== 1 ? "s" : ""}</span>
                      </Show>
                      <Show when={!p.models?.length}>—</Show>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "12px", "font-weight": "500", display: "inline-block", background: p.enabled ? "#16a34a" : "#3f3f46", color: "white" }}>
                        {p.enabled ? "enabled" : "disabled"}
                      </span>
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
