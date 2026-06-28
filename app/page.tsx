import { Brain, Cpu, Layers, MessageSquare, Network, Workflow, ArrowRight, GitBranch } from "lucide-react"
import Link from "next/link"

const features = [
  { icon: Brain, label: "Multi-Provider AI", desc: "80+ LLM providers — Anthropic, OpenAI, Google, Groq, and more" },
  { icon: Layers, label: "Memory System", desc: "Persistent, context-aware memory with auto-recall and capture" },
  { icon: MessageSquare, label: "Multi-Channel", desc: "Deploy agents across Slack, Discord, WhatsApp, Telegram, iMessage" },
  { icon: Network, label: "MCP Support", desc: "Model Context Protocol server for tool integration" },
  { icon: Cpu, label: "Autonomous Agents", desc: "Proactive planning, task execution, and continuous observation" },
  { icon: Workflow, label: "Plugin Ecosystem", desc: "120+ extensions — providers, channels, tools, and skills" },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-bg-strong flex items-center justify-center">
            <span className="text-bg-primary font-semibold text-sm">K</span>
          </div>
          <span className="text-text-strong font-medium">Kairos</span>
        </div>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-text-primary hover:text-text-strong transition-colors">
            Dashboard
          </Link>
          <a href="https://kairos.ai/docs" className="text-text-primary hover:text-text-strong transition-colors">
            Docs
          </a>
          <a
            href="https://github.com/chronokairo/Kairos"
            className="text-text-primary hover:text-text-strong transition-colors"
          >
            <GitBranch className="size-5" />
          </a>
        </nav>
      </header>

      <main>
        <section className="px-6 pt-24 pb-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-interactive text-bg-strong text-sm mb-6">
            <span className="size-1.5 rounded-full bg-current" />
            v1.14.30
          </div>
          <h1 className="text-4xl font-light text-text-strong tracking-tight mb-4">
            Persistent, proactive AI agents
          </h1>
          <p className="text-lg text-text-primary max-w-2xl mx-auto leading-relaxed">
            Kairos is an open-source AI agent platform with continuous memory, autonomous action,
            and multi-channel deployment. Run agents in your terminal, IDE, Slack, or anywhere.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-bg-strong text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Dashboard
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://kairos.ai/docs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text-strong text-sm font-medium hover:bg-bg-weak transition-colors"
            >
              Documentation
            </a>
          </div>
        </section>

        <section className="px-6 pb-24 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.label} className="p-5 rounded-xl border border-border bg-bg-primary hover:bg-bg-weak transition-colors">
                <f.icon className="size-5 text-text-strong mb-3" />
                <h3 className="text-sm font-medium text-text-strong mb-1">{f.label}</h3>
                <p className="text-sm text-text-primary">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-text-weak">
        <p>Kairos — Open source MIT</p>
      </footer>
    </div>
  )
}
