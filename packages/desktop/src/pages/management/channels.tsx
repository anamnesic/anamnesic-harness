import { createResource, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Channel = {
  id: string
  name: string
  type: string
  enabled: boolean
  config?: Record<string, unknown>
}

export default function ChannelsPage() {
  const server = useServer()

  const [channels] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/integrations`).then((r) => r.json() as Promise<Channel[]>)
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Channels</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "32px" }}>Integration channels and connectors</p>

      <Switch>
        <Match when={channels.loading}>
          <p style={{ color: "#71717a" }}>Loading…</p>
        </Match>
        <Match when={channels.error}>
          <p style={{ color: "#f87171" }}>Failed to load channels</p>
        </Match>
        <Match when={channels()}>
          <table style={{ width: "100%", "border-collapse": "collapse" }}>
            <thead>
              <tr>
                {(["Name", "Type", "Config keys", "Status"] as const).map((h) => (
                  <th style={{ "font-size": "12px", color: "#71717a", "text-transform": "uppercase", "font-weight": "600", "text-align": "left", padding: "8px 12px", "border-bottom": "1px solid #27272a" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <For each={channels()}>
                {(ch) => (
                  <tr style={{ "border-bottom": "1px solid #27272a" }}>
                    <td style={{ padding: "10px 12px", "font-size": "14px", color: "white" }}>{ch.name}</td>
                    <td style={{ padding: "10px 12px", "font-size": "13px", color: "#a1a1aa" }}>{ch.type}</td>
                    <td style={{ padding: "10px 12px", "font-size": "13px", color: "#71717a" }}>
                      <Show when={ch.config}>{Object.keys(ch.config!).join(", ") || "—"}</Show>
                      <Show when={!ch.config}>—</Show>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "12px", "font-weight": "500", display: "inline-block", background: ch.enabled ? "#16a34a" : "#3f3f46", color: "white" }}>
                        {ch.enabled ? "enabled" : "disabled"}
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
