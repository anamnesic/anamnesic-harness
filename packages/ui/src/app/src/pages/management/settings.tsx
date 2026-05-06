import { createResource, createSignal, For, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Settings = Record<string, unknown>

export default function SettingsPage() {
  const server = useServer()
  const [saving, setSaving] = createSignal(false)
  const [saveMsg, setSaveMsg] = createSignal("")

  const [settings, { refetch }] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/settings`).then((r) => r.json() as Promise<Settings>)
  })

  const handleSave = async (key: string, value: string) => {
    setSaving(true)
    setSaveMsg("")
    const base = server.current?.http.url ?? ""
    await fetch(`${base}/api/v1/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => null)
    setSaving(false)
    setSaveMsg(`Saved "${key}"`)
    void refetch()
    setTimeout(() => setSaveMsg(""), 3000)
  }

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "var(--text-base)" }}>Settings</h1>
      <p style={{ "font-size": "14px", color: "var(--text-weak)", "margin-bottom": "32px" }}>Configure application settings</p>

      <Switch>
        <Match when={settings.loading}>
          <p style={{ color: "var(--text-weak)" }}>Loading…</p>
        </Match>
        <Match when={settings.error}>
          <p style={{ color: "var(--text-critical-base, #dc2626)" }}>Failed to load settings</p>
        </Match>
        <Match when={settings()}>
          {(s) => (
            <div style={{ display: "flex", "flex-direction": "column", gap: "16px", "max-width": "600px" }}>
              <For each={Object.entries(s())}>
                {([key, val]) => {
                  const [editVal, setEditVal] = createSignal(String(val ?? ""))
                  return (
                    <div style={{ background: "var(--surface-raised-base, var(--surface-base))", border: "1px solid var(--border-base)", "border-radius": "10px", padding: "16px 20px" }}>
                      <label style={{ "font-size": "13px", "font-weight": "600", color: "var(--text-weak)", display: "block", "margin-bottom": "8px" }}>
                        {key}
                      </label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          value={editVal()}
                          onInput={(e) => setEditVal(e.currentTarget.value)}
                          style={{ background: "var(--surface-base)", border: "1px solid var(--border-base)", "border-radius": "6px", padding: "8px 12px", color: "var(--text-base)", "font-size": "14px", flex: "1" }}
                        />
                        <button
                          type="button"
                          disabled={saving()}
                          onClick={() => handleSave(key, editVal())}
                          style={{ background: "var(--text-base)", border: "none", "border-radius": "6px", padding: "8px 16px", color: "var(--background-base)", "font-size": "13px", "font-weight": "600", cursor: "pointer" }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
          )}
        </Match>
      </Switch>

      <Switch>
        <Match when={saveMsg()}>
          <p style={{ color: "#4ade80", "margin-top": "16px", "font-size": "14px" }}>{saveMsg()}</p>
        </Match>
      </Switch>
    </div>
  )
}
