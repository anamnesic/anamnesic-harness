import { createResource, Show, Switch, Match } from "solid-js"
import { useServer } from "@/context/server"

type Metrics = {
  uptimeDays: number
  uptimeHours: number
  memUsedMb: number
  memTotalMb: number
  cpuLoad: number
  totalRequests: number
  totalErrors: number
  errorRate: number
}

type AgentStats = {
  totalAgents: number
  activeAgents: number
  totalTasksCompleted: number
  totalTasksFailed: number
}

const cardStyle = {
  background: "#18181b",
  border: "1px solid #27272a",
  "border-radius": "10px",
  padding: "16px 20px",
}

const statLabelStyle = { "font-size": "12px", color: "#71717a", "margin-bottom": "4px" }
const statValueStyle = { "font-size": "28px", "font-weight": "700", color: "white" }

export default function DashboardPage() {
  const server = useServer()

  const [metrics] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/metrics`).then((r) => r.json() as Promise<Metrics>)
  })

  const [agentStats] = createResource(() => {
    const base = server.current?.http.url ?? ""
    return fetch(`${base}/api/v1/agents/stats`).then((r) => r.json() as Promise<AgentStats>)
  })

  return (
    <div>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px", color: "white" }}>Dashboard</h1>
      <p style={{ "font-size": "14px", color: "#71717a", "margin-bottom": "32px" }}>System overview and stats</p>

      <div style={{ "margin-bottom": "32px" }}>
        <div style={{ "font-size": "13px", "font-weight": "600", color: "#a1a1aa", "margin-bottom": "16px", "text-transform": "uppercase", "letter-spacing": "0.06em" }}>
          System Metrics
        </div>
        <Switch>
          <Match when={metrics.loading}>
            <p style={{ color: "#71717a" }}>Loading…</p>
          </Match>
          <Match when={metrics.error}>
            <p style={{ color: "#f87171" }}>Failed to load metrics</p>
          </Match>
          <Match when={metrics()}>
            {(m) => (
              <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Uptime</div>
                  <div style={statValueStyle}>{m().uptimeDays}d {m().uptimeHours}h</div>
                </div>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Memory</div>
                  <div style={statValueStyle}>{m().memUsedMb}<span style={{ "font-size": "14px", color: "#71717a" }}>/{m().memTotalMb} MB</span></div>
                </div>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>CPU Load</div>
                  <div style={statValueStyle}>{m().cpuLoad.toFixed(1)}%</div>
                </div>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Total Requests</div>
                  <div style={statValueStyle}>{m().totalRequests}</div>
                </div>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Total Errors</div>
                  <div style={{ ...statValueStyle, color: m().totalErrors > 0 ? "#f87171" : "white" }}>{m().totalErrors}</div>
                </div>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Error Rate</div>
                  <div style={{ ...statValueStyle, color: m().errorRate > 5 ? "#f87171" : "white" }}>{m().errorRate.toFixed(2)}%</div>
                </div>
              </div>
            )}
          </Match>
        </Switch>
      </div>

      <div>
        <div style={{ "font-size": "13px", "font-weight": "600", color: "#a1a1aa", "margin-bottom": "16px", "text-transform": "uppercase", "letter-spacing": "0.06em" }}>
          Agent Stats
        </div>
        <Switch>
          <Match when={agentStats.loading}>
            <p style={{ color: "#71717a" }}>Loading…</p>
          </Match>
          <Match when={agentStats.error}>
            <p style={{ color: "#f87171" }}>Failed to load agent stats</p>
          </Match>
          <Match when={agentStats()}>
            {(s) => (
              <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Total Agents</div>
                  <div style={statValueStyle}>{s().totalAgents}</div>
                </div>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Active Agents</div>
                  <div style={{ ...statValueStyle, color: "#16a34a" }}>{s().activeAgents}</div>
                </div>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Tasks Completed</div>
                  <div style={statValueStyle}>{s().totalTasksCompleted}</div>
                </div>
                <div style={cardStyle}>
                  <div style={statLabelStyle}>Tasks Failed</div>
                  <div style={{ ...statValueStyle, color: s().totalTasksFailed > 0 ? "#f87171" : "white" }}>{s().totalTasksFailed}</div>
                </div>
              </div>
            )}
          </Match>
        </Switch>
      </div>
    </div>
  )
}
