import { createResource, For, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Project = {
  id: string
  name: string
  path?: string
  description?: string
  createdAt?: string
  sessionCount?: number
}

export default function ProjectsPage() {
  const server = useServer()

  const [projects] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/projects`).then((r) => r.json() as Promise<Project[]>)
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "var(--text-base)" }}>Projects</h1>
      <p style={{ "font-size": "14px", color: "var(--text-weak)", "margin-bottom": "32px" }}>All registered projects</p>

      <Switch>
        <Match when={projects.loading}>
          <p style={{ color: "var(--text-weak)" }}>Loading…</p>
        </Match>
        <Match when={projects.error}>
          <p style={{ color: "var(--text-critical-base, #dc2626)" }}>Failed to load projects</p>
        </Match>
        <Match when={projects()}>
          {(ps) => (
            <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              <For each={ps()}>
                {(project) => (
                  <div style={{ background: "var(--surface-raised-base, var(--surface-base))", border: "1px solid var(--border-base)", "border-radius": "10px", padding: "16px 20px" }}>
                    <div style={{ "font-size": "15px", "font-weight": "600", color: "var(--text-base)", "margin-bottom": "6px" }}>{project.name}</div>
                    <Show when={project.path}>
                      <div style={{ "font-size": "12px", color: "var(--text-weak)", "font-family": "monospace", "margin-bottom": "8px", "word-break": "break-all" }}>
                        {project.path}
                      </div>
                    </Show>
                    <Show when={project.description}>
                      <p style={{ "font-size": "13px", color: "var(--text-weak)", margin: "0 0 8px" }}>{project.description}</p>
                    </Show>
                    <div style={{ display: "flex", gap: "16px", "font-size": "12px", color: "#52525b", "margin-top": "auto" }}>
                      <Show when={project.sessionCount != null}>
                        <span>{project.sessionCount} sessions</span>
                      </Show>
                      <Show when={project.createdAt}>
                        <span>{new Date(project.createdAt!).toLocaleDateString()}</span>
                      </Show>
                    </div>
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
