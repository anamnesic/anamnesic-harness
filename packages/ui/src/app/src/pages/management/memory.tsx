import { createSignal, createResource, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type MemoryResult = {
  id: string
  content: string
  score: number
  metadata?: Record<string, unknown>
}

type RecallResponse = { results: MemoryResult[] }

export default function MemoryPage() {
  const server = useServer()
  const [query, setQuery] = createSignal("")
  const [submitted, setSubmitted] = createSignal("")

  const [results] = createResource(submitted, (q) => {
    if (!q) return Promise.resolve<RecallResponse>({ results: [] })
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/recall/reranked`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, limit: 20 }),
    }).then((r) => r.json() as Promise<RecallResponse>)
  })

  const handleSearch = () => setSubmitted(query())

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Memory</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "24px" }}>Search and recall agent memory</p>

      <div style={{ display: "flex", gap: "8px", "margin-bottom": "28px" }}>
        <input
          type="text"
          placeholder="Enter a recall query…"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{ background: "#18181b", border: "1px solid #27272a", "border-radius": "6px", padding: "8px 12px", color: "white", "font-size": "14px", width: "360px" }}
        />
        <button
          type="button"
          onClick={handleSearch}
          style={{ background: "#f5c200", border: "none", "border-radius": "6px", padding: "8px 20px", color: "#09090b", "font-size": "14px", "font-weight": "600", cursor: "pointer" }}
        >
          Search
        </button>
      </div>

      <Switch>
        <Match when={results.loading}>
          <p style={{ color: "#71717a" }}>Searching…</p>
        </Match>
        <Match when={results.error}>
          <p style={{ color: "#f87171" }}>Search failed</p>
        </Match>
        <Match when={results()}>
          {(res) => (
            <Show when={submitted()}>
              <div style={{ display: "flex", "flex-direction": "column", gap: "12px" }}>
                <Show when={res().results.length === 0}>
                  <p style={{ color: "#71717a" }}>No results found.</p>
                </Show>
                <For each={res().results}>
                  {(item) => (
                    <div style={{ background: "#18181b", border: "1px solid #27272a", "border-radius": "10px", padding: "16px 20px" }}>
                      <div style={{ display: "flex", "justify-content": "space-between", "align-items": "flex-start", "margin-bottom": "8px" }}>
                        <span style={{ "font-size": "12px", "font-family": "monospace", color: "#71717a" }}>{item.id}</span>
                        <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "12px", "font-weight": "500", display: "inline-block", background: "#27272a", color: "#f5c200" }}>
                          score: {item.score.toFixed(3)}
                        </span>
                      </div>
                      <p style={{ "font-size": "14px", color: "white", margin: "0", "white-space": "pre-wrap" }}>{item.content}</p>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          )}
        </Match>
      </Switch>
    </div>
  )
}
