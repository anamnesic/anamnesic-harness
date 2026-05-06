import { createResource, createSignal, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Extension = {
  namespace: string
  name: string
  displayName?: string
  description?: string
  version: string
  averageRating?: number
}

type SearchResult = { extensions: Extension[] }

export default function PluginsPage() {
  const server = useServer()
  const [query, setQuery] = createSignal("kairos plugin")

  const [result] = createResource(query, (q) => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/extensions/open-vsx/search?query=${encodeURIComponent(q)}&size=24`).then(
      (r) => r.json() as Promise<SearchResult>,
    )
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Plugins</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "24px" }}>Browse and discover plugins</p>

      <input
        type="text"
        placeholder="Search plugins…"
        value={query()}
        onInput={(e) => setQuery(e.currentTarget.value)}
        style={{ background: "#18181b", border: "1px solid #27272a", "border-radius": "6px", padding: "8px 12px", color: "white", "font-size": "14px", width: "320px", "margin-bottom": "28px", display: "block" }}
      />

      <Switch>
        <Match when={result.loading}>
          <p style={{ color: "#71717a" }}>Loading…</p>
        </Match>
        <Match when={result.error}>
          <p style={{ color: "#f87171" }}>Failed to load plugins</p>
        </Match>
        <Match when={result()}>
          {(res) => (
            <>
              <p style={{ "font-size": "13px", color: "#71717a", "margin-bottom": "20px" }}>{res().extensions.length} results</p>
              <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
                <For each={res().extensions}>
                  {(ext) => (
                    <div style={{ background: "#18181b", border: "1px solid #27272a", "border-radius": "10px", padding: "16px 20px" }}>
                      <div style={{ "font-size": "15px", "font-weight": "600", color: "white", "margin-bottom": "4px" }}>
                        {ext.displayName ?? ext.name}
                      </div>
                      <div style={{ "font-size": "12px", color: "#71717a", "margin-bottom": "8px" }}>
                        {ext.namespace}.{ext.name} · v{ext.version}
                      </div>
                      <Show when={ext.description}>
                        <p style={{ "font-size": "13px", color: "#a1a1aa", margin: "0" }}>{ext.description}</p>
                      </Show>
                      <Show when={ext.averageRating != null}>
                        <div style={{ "margin-top": "8px", "font-size": "12px", color: "#f5c200" }}>
                          ★ {ext.averageRating!.toFixed(1)}
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </>
          )}
        </Match>
      </Switch>
    </div>
  )
}
