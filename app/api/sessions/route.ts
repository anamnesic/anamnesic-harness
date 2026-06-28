import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const sessions = [
  {
    id: "sess_001",
    title: "Refactor authentication module",
    provider: "Anthropic",
    model: "claude-sonnet-4-20250514",
    messageCount: 24,
    createdAt: "2026-06-28T10:30:00Z",
  },
  {
    id: "sess_002",
    title: "Debug memory retrieval issue",
    provider: "OpenAI",
    model: "gpt-4.1",
    messageCount: 16,
    createdAt: "2026-06-28T09:15:00Z",
  },
  {
    id: "sess_003",
    title: "Design new plugin API",
    provider: "Google",
    model: "gemini-2.5-pro",
    messageCount: 31,
    createdAt: "2026-06-27T14:00:00Z",
  },
  {
    id: "sess_004",
    title: "Code review — PR #423",
    provider: "Anthropic",
    model: "claude-opus-4-20250514",
    messageCount: 8,
    createdAt: "2026-06-27T11:45:00Z",
  },
  {
    id: "sess_005",
    title: "Write unit tests for file transfer plugin",
    provider: "OpenAI",
    model: "o3",
    messageCount: 42,
    createdAt: "2026-06-26T16:20:00Z",
  },
  {
    id: "sess_006",
    title: "Investigate SSE timeout in proxy",
    provider: "Mistral",
    model: "mistral-large-2411",
    messageCount: 12,
    createdAt: "2026-06-26T08:00:00Z",
  },
  {
    id: "sess_007",
    title: "Set up new workspace configuration",
    provider: "Anthropic",
    model: "claude-sonnet-4-20250514",
    messageCount: 5,
    createdAt: "2026-06-25T13:30:00Z",
  },
]

export async function GET() {
  return NextResponse.json({
    total: sessions.length,
    sessions,
  })
}
