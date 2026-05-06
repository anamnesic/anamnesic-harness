import { createResource, createSignal, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type VaultEntry = {
  key: string
  createdAt?: string
  updatedAt?: string
}

export default function VaultPage() {
  const server = useServer()
  const [newKey, setNewKey] = createSignal("")
  const [newValue, setNewValue] = createSignal("")
  const [saving, setSaving] = createSignal(false)
  const [deleting, setDeleting] = createSignal<string | null>(null)

  const [entries, { refetch }] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/vault`).then((r) => r.json() as Promise<VaultEntry[]>)
  })

  const handleAdd = async () => {
    if (!newKey().trim()) return
    setSaving(true)
    const base = server.current?.http.url ?? ""
    await fetch(`${base}/api/v1/vault`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey(), value: newValue() }),
    }).catch(() => null)
    setNewKey("")
    setNewValue("")
    setSaving(false)
    void refetch()
  }

  const handleDelete = async (key: string) => {
    setDeleting(key)
    const base = server.current?.http.url ?? ""
    await fetch(`${base}/api/v1/vault/${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => null)
    setDeleting(null)
    void refetch()
  }

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Vault</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "32px" }}>Manage secrets and credentials</p>

      <div style={{ background: "#18181b", border: "1px solid #27272a", "border-radius": "10px", padding: "16px 20px", "max-width": "560px", "margin-bottom": "32px" }}>
        <div style={{ "font-size": "13px", "font-weight": "600", color: "#a1a1aa", "margin-bottom": "12px", "text-transform": "uppercase", "letter-spacing": "0.06em" }}>
          Add Secret
        </div>
        <div style={{ display: "flex", "flex-direction": "column", gap: "10px" }}>
          <input
            type="text"
            placeholder="Key"
            value={newKey()}
            onInput={(e) => setNewKey(e.currentTarget.value)}
            style={{ background: "#09090b", border: "1px solid #27272a", "border-radius": "6px", padding: "8px 12px", color: "white", "font-size": "14px" }}
          />
          <input
            type="password"
            placeholder="Value"
            value={newValue()}
            onInput={(e) => setNewValue(e.currentTarget.value)}
            style={{ background: "#09090b", border: "1px solid #27272a", "border-radius": "6px", padding: "8px 12px", color: "white", "font-size": "14px" }}
          />
          <button
            type="button"
            disabled={saving() || !newKey().trim()}
            onClick={handleAdd}
            style={{ background: "#f5c200", border: "none", "border-radius": "6px", padding: "8px 20px", color: "#09090b", "font-size": "14px", "font-weight": "600", cursor: "pointer", "align-self": "flex-start" }}
          >
            {saving() ? "Saving…" : "Add Secret"}
          </button>
        </div>
      </div>

      <div style={{ "font-size": "13px", "font-weight": "600", color: "#a1a1aa", "margin-bottom": "16px", "text-transform": "uppercase", "letter-spacing": "0.06em" }}>
        Stored Secrets
      </div>

      <Switch>
        <Match when={entries.loading}>
          <p style={{ color: "#71717a" }}>Loading…</p>
        </Match>
        <Match when={entries.error}>
          <p style={{ color: "#f87171" }}>Failed to load vault entries</p>
        </Match>
        <Match when={entries()}>
          <Show when={(entries() ?? []).length === 0}>
            <p style={{ color: "#71717a" }}>No secrets stored.</p>
          </Show>
          <div style={{ display: "flex", "flex-direction": "column", gap: "8px", "max-width": "560px" }}>
            <For each={entries()}>
              {(entry) => (
                <div style={{ background: "#18181b", border: "1px solid #27272a", "border-radius": "8px", padding: "12px 16px", display: "flex", "align-items": "center", "justify-content": "space-between" }}>
                  <div>
                    <div style={{ "font-size": "14px", color: "white", "font-family": "monospace" }}>{entry.key}</div>
                    <Show when={entry.updatedAt}>
                      <div style={{ "font-size": "12px", color: "#52525b", "margin-top": "2px" }}>
                        Updated {new Date(entry.updatedAt!).toLocaleString()}
                      </div>
                    </Show>
                  </div>
                  <button
                    type="button"
                    disabled={deleting() === entry.key}
                    onClick={() => handleDelete(entry.key)}
                    style={{ background: "transparent", border: "1px solid #dc2626", "border-radius": "6px", padding: "4px 12px", "font-size": "13px", color: "#f87171", cursor: "pointer" }}
                  >
                    {deleting() === entry.key ? "…" : "Delete"}
                  </button>
                </div>
              )}
            </For>
          </div>
        </Match>
      </Switch>
    </div>
  )
}
