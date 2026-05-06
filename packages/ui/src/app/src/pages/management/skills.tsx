import { createResource, createMemo, createSignal, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Skill = {
  id: string
  name: string
  description?: string
  category?: string
  enabled: boolean
}

export default function SkillsPage() {
  const server = useServer()
  const [search, setSearch] = createSignal("")
  const [categoryFilter, setCategoryFilter] = createSignal("")

  const [skills] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/skills`).then((r) => r.json() as Promise<Skill[]>)
  })

  const categories = createMemo(() => {
    const cats = new Set<string>()
    for (const s of skills() ?? []) if (s.category) cats.add(s.category)
    return Array.from(cats).sort()
  })

  const filtered = createMemo(() => {
    const q = search().toLowerCase()
    const cat = categoryFilter()
    return (skills() ?? []).filter(
      (s) =>
        (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) &&
        (!cat || s.category === cat),
    )
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Skills</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "24px" }}>Browse and manage agent skills</p>

      <div style={{ display: "flex", gap: "12px", "margin-bottom": "24px" }}>
        <input
          type="text"
          placeholder="Search skills…"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          style={{ background: "#18181b", border: "1px solid #27272a", "border-radius": "6px", padding: "8px 12px", color: "white", "font-size": "14px", width: "260px" }}
        />
        <select
          value={categoryFilter()}
          onChange={(e) => setCategoryFilter(e.currentTarget.value)}
          style={{ background: "#18181b", border: "1px solid #27272a", "border-radius": "6px", padding: "8px 12px", color: "white", "font-size": "14px" }}
        >
          <option value="">All categories</option>
          <For each={categories()}>{(c) => <option value={c}>{c}</option>}</For>
        </select>
      </div>

      <Switch>
        <Match when={skills.loading}>
          <p style={{ color: "#71717a" }}>Loading…</p>
        </Match>
        <Match when={skills.error}>
          <p style={{ color: "#f87171" }}>Failed to load skills</p>
        </Match>
        <Match when={skills()}>
          <table style={{ width: "100%", "border-collapse": "collapse" }}>
            <thead>
              <tr>
                {(["Name", "Category", "Status"] as const).map((h) => (
                  <th style={{ "font-size": "12px", color: "#71717a", "text-transform": "uppercase", "font-weight": "600", "text-align": "left", padding: "8px 12px", "border-bottom": "1px solid #27272a" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <For each={filtered()}>
                {(skill) => (
                  <tr style={{ "border-bottom": "1px solid #27272a" }}>
                    <td style={{ padding: "10px 12px", "font-size": "14px", color: "white" }}>
                      {skill.name}
                      <Show when={skill.description}>
                        <div style={{ "font-size": "12px", color: "#71717a" }}>{skill.description}</div>
                      </Show>
                    </td>
                    <td style={{ padding: "10px 12px", "font-size": "13px", color: "#a1a1aa" }}>{skill.category ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ "border-radius": "4px", padding: "2px 8px", "font-size": "12px", "font-weight": "500", display: "inline-block", background: skill.enabled ? "#16a34a" : "#3f3f46", color: "white" }}>
                        {skill.enabled ? "enabled" : "disabled"}
                      </span>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
          <Show when={filtered().length === 0}>
            <p style={{ color: "#71717a", "margin-top": "16px" }}>No skills found.</p>
          </Show>
        </Match>
      </Switch>
    </div>
  )
}
