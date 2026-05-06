import { createResource, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Tool = {
  name: string
  description?: string
  category?: string
  parameters?: unknown[]
}

const cardStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  "border-radius": "10px",
  padding: "16px 20px",
}

export default function ToolsPage() {
  const server = useServer()

  const [tools] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/tools`).then((r) => r.json() as Promise<Tool[]>)
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Tools</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "32px" }}>Available tools for agents</p>

      <Switch>
        <Match when={tools.loading}>
          <p style={{ color: "#71717a" }}>Loading…</p>
        </Match>
        <Match when={tools.error}>
          <p style={{ color: "#f87171" }}>Failed to load tools</p>
        </Match>
        <Match when={tools()}>
          {(ts) => (
            <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
              <For each={ts()}>
                {(tool) => (
                  <div style={cardStyle}>
                    <div style={{ "font-size": "15px", "font-weight": "600", color: "white", "margin-bottom": "6px" }}>{tool.name}</div>
                    <Show when={tool.category}>
                      <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "11px", "font-weight": "500", display: "inline-block", background: "#27272a", color: "#a1a1aa", "margin-bottom": "8px" }}>
                        {tool.category}
                      </span>
                    </Show>
                    <Show when={tool.description}>
                      <p style={{ "font-size": "13px", color: "#71717a", margin: "0" }}>{tool.description}</p>
                    </Show>
                    <Show when={tool.parameters?.length}>
                      <div style={{ "margin-top": "8px", "font-size": "12px", color: "#52525b" }}>
                        {tool.parameters!.length} parameter{tool.parameters!.length !== 1 ? "s" : ""}
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          )}
        </Match>
      </Switch>
    </div>
  )
}
