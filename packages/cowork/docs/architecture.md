# Architecture

## Overview

Kuse Cowork is a desktop application built on [Tauri](https://tauri.app/), combining a **SolidJS + TypeScript** frontend with a **Rust** backend. This architecture delivers native performance, a small binary footprint (~10 MB), and cross-platform support (macOS, Windows, Linux).

```
┌────────────────────────────────────────────────────┐
│                   Frontend (WebView)                │
│              SolidJS + TypeScript + Vite            │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ TaskPanel│  │ Sidebar  │  │ Settings / MCP / │  │
│  │ Chat     │  │ TaskList │  │ Skills panels    │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└──────────────────────┬─────────────────────────────┘
                       │  Tauri IPC (invoke / events)
┌──────────────────────▼─────────────────────────────┐
│                   Backend (Rust)                    │
│                                                     │
│  ┌───────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  commands │  │  agent/      │  │   mcp/      │  │
│  │  (IPC)    │  │  AgentLoop   │  │  MCPManager │  │
│  └───────────┘  └──────┬───────┘  └──────┬──────┘  │
│                        │                 │          │
│  ┌─────────────────────▼─────────────────▼──────┐  │
│  │              tools/                           │  │
│  │  file_read · file_write · file_edit           │  │
│  │  bash · glob · grep · list_dir · docker       │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │  database    │  │  llm_client  │                 │
│  │  (SQLite)    │  │  (HTTP/SSE)  │                 │
│  └──────────────┘  └──────────────┘                 │
└────────────────────────────────────────────────────┘
```

---

## Frontend

| Layer | Technology | Purpose |
|---|---|---|
| UI framework | SolidJS 1.8 | Reactive component tree |
| Language | TypeScript 5.3 | Type safety |
| Bundler | Vite 5 | Fast dev server + production build |
| State management | SolidJS signals + stores | `src/stores/` |
| Tauri bridge | `@tauri-apps/api` | IPC invoke + event listen |

### Key Components

| Component | File | Role |
|---|---|---|
| `App` | `src/App.tsx` | Root component, orchestrates task state |
| `TaskSidebar` | `src/components/TaskSidebar.tsx` | Task list + navigation |
| `TaskPanel` | `src/components/TaskPanel.tsx` | Active task view |
| `AgentMain` | `src/components/AgentMain.tsx` | Agent execution view |
| `Chat` | `src/components/Chat.tsx` | Message rendering |
| `Settings` | `src/components/Settings.tsx` | API keys, model selection |
| `MCPSettings` | `src/components/MCPSettings.tsx` | MCP server management |
| `SkillsList` | `src/components/SkillsList.tsx` | Skills browser |
| `ModelSelector` | `src/components/ModelSelector.tsx` | Model picker |

### Stores

| Store | File | Contents |
|---|---|---|
| `settings` | `src/stores/settings.ts` | API keys, model, provider config |
| `chat` | `src/stores/chat.ts` | Conversation / message state |

---

## Backend

The Rust backend lives entirely in `src-tauri/src/`.

### Module Map

```
src-tauri/src/
├── main.rs            # Binary entry point
├── lib.rs             # App bootstrap, plugin registration, IPC handler registration
├── commands.rs        # All Tauri IPC commands (the public API surface)
├── database.rs        # SQLite wrapper (Settings, Tasks, Messages, MCP config)
├── llm_client.rs      # Multi-provider LLM HTTP client (streaming SSE)
├── claude.rs          # Legacy Anthropic client (kept for compatibility)
├── agent/
│   ├── agent_loop.rs  # Main agentic loop (plan → execute → reflect)
│   ├── message_builder.rs  # Constructs LLM request payloads
│   ├── tool_executor.rs    # Dispatches tool calls to tools/
│   └── types.rs            # Shared agent types (AgentEvent, AgentConfig …)
├── mcp/
│   ├── client.rs      # MCPManager — connects to MCP servers
│   ├── http_client.rs # HTTP transport for MCP
│   ├── config.rs      # Server configuration helpers
│   ├── storage.rs     # Persists MCP server configs to DB
│   └── types.rs       # MCPServerConfig, MCPToolCall, MCPToolResult …
├── skills/
│   └── mod.rs         # Loads bundled skill markdown files
└── tools/
    ├── mod.rs         # Tool registry (get_all_tools / get_tools)
    ├── bash.rs        # Shell command execution
    ├── docker.rs      # Docker container commands
    ├── file_read.rs   # Read file contents
    ├── file_write.rs  # Write / create files
    ├── file_edit.rs   # Patch / replace content in files
    ├── glob.rs        # Pattern-based file search
    ├── grep.rs        # Regex search within files
    └── list_dir.rs    # Directory listing
```

### Data Persistence

All persistent state is stored in a single **SQLite** database (`database.rs`) placed in the OS application data directory. Tables:

| Table | Purpose |
|---|---|
| `settings` | Single-row serialized JSON of user settings |
| `conversations` | Chat conversation metadata |
| `messages` | Individual chat messages |
| `tasks` | Agent tasks (title, description, status, plan) |
| `task_messages` | Messages within a task thread |
| `mcp_servers` | MCP server configurations |

### IPC Communication

The frontend communicates with the Rust backend exclusively through Tauri's IPC mechanism:

- **`invoke`** – request/response calls (settings, task CRUD, etc.)
- **`listen`** – streaming events pushed by the backend during agent execution (`AgentEvent`)

Agent events streamed during execution:

| Event | Meaning |
|---|---|
| `text` | Incremental text from the model |
| `plan` | Agent produced an execution plan |
| `step_start` / `step_done` | Plan step progress |
| `tool_start` / `tool_end` | Tool invocation start / result |
| `turn_complete` | One agent turn finished |
| `done` | Task fully complete |
| `error` | Unrecoverable error |

---

## Agent Loop

```
User message
     │
     ▼
 AgentLoop::run()
     │
     ├─ Build system prompt (skills + tool definitions + MCP tools)
     │
     ├─ Send to LLM ──────────────────────────────────────┐
     │                                                     │
     │◄──── text delta ────── emit AgentEvent::text        │
     │◄──── tool_use block ─── ToolExecutor::execute()     │
     │           │                                         │
     │           └── result injected as tool_result msg ──►│
     │                                                     │
     └─ Loop until stop_reason = "end_turn" or max_turns ──┘
```

---

## Security Model

- API keys are stored **only** in the local SQLite database; they are never transmitted anywhere except the configured LLM provider endpoint.
- Shell (`bash`) and Docker commands execute in the **project path** scope provided per task — the agent cannot access paths outside this boundary unless explicitly granted.
- Docker execution provides an additional **container isolation** layer for untrusted code.
- Tauri's capability system (`capabilities/default.json`) limits which OS APIs the WebView can access.
