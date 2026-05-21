# OPENFORGE — FULL SYSTEM BUILD PROMPT

Build a **local-first AI development platform called OpenForge** that unifies:

1. a **terminal-native AI coding assistant**
2. a **multi-channel AI agent gateway**

This is **one cohesive system**, not two separate apps.

---

# CORE PRINCIPLE

Design OpenForge as:

* **Forge Core (backend runtime)** → TypeScript/Node.js service
* **Forge TUI (frontend client)** → Go terminal interface

Both must:

* share the same agents, sessions, tools, and memory
* communicate over a real-time protocol (WebSocket-first)
* work together seamlessly but also degrade independently

---

# HIGH-LEVEL ARCHITECTURE

/openforge
/core        → TypeScript runtime (agents, gateway, tools)
/tui         → Go TUI client
/protocol    → shared schemas (JSON contracts)
/plugins     → providers, tools, channels
/apps        → optional clients (web/mobile)

---

# 1. FORGE CORE (TypeScript)

## Stack

* Node.js + TypeScript (strict)
* pnpm monorepo (Bun optional)
* Zod for validation
* Vitest for testing

## Responsibilities

* agent execution engine
* tool orchestration
* session + memory storage
* LLM provider abstraction
* messaging gateway
* security + permissions
* plugin system

---

## CLI

openforge core
openforge doctor
openforge plugins
openforge channels
openforge sessions

---

## CONFIG SYSTEM

Path:
~/.openforge/config.json
.project/.openforge/config.json

Features:

* deep merge (project overrides global)
* hot reload
* corruption recovery (fallback to last-known-good)

---

## AGENT SYSTEM

Agents defined in config:

{
"agents": {
"coder": { "model": "...", "tools": ["bash", "fs"] },
"assistant": {},
"task": {},
"summarizer": {},
"title": {}
}
}

Each agent supports:

* model selection
* fallback provider chain
* token limits
* tool access control

---

## SESSION SYSTEM

Storage:
~/.openforge/workspace/<agent>/<session>.jsonl

Also maintain:

* SQLite → metadata
* LanceDB → embeddings

Features:

* append-only JSONL transcripts
* auto-title generation
* context window tracking
* at 95% usage:
  → summarize
  → start new session with summary carried forward

---

## TOOL SYSTEM

Unified tool registry.

### Required tools:

* bash (sandboxed)

  * blocklist: curl, wget, nc, telnet
  * timeout: 1m default, 10m max
  * output cap: 30KB
* file read/write/edit
* multi-file patch (unified diff)
* glob / grep / ls
* HTTP fetch
* git operations (add this)
* LSP diagnostics
* browser automation (Chrome CDP)
* cron scheduling
* image generation
* session spawning

### Tool Execution Model

* agent emits tool call
* system pauses
* permission check
* execute
* stream result back

---

## PERMISSION SYSTEM

Modes:

* interactive (ask user via TUI or client)
* owner-only
* always-allow
* yolo (sandbox required)

Approval options:

* allow ერთხელ
* deny
* allow for session

---

## PROVIDER SYSTEM

Plugin-based abstraction.

Must support:

* OpenAI
* Anthropic
* Google Gemini
* Groq
* DeepSeek
* Ollama
* LM Studio
* * extensible

Features:

* streaming normalization
* retry (max 3, exponential backoff)
* fallback chains

Stub providers by default so system runs without API keys.

---

## CHANNEL GATEWAY

Plugin system for messaging platforms.

Each plugin implements:

* setupChannel
* startChannel
* sendMessage
* handleCommand
* handleApproval

### Include:

* Discord
* Telegram
* Slack
* WhatsApp
* Matrix
* Signal
* iMessage (via bridge)
* IRC
* Teams / Google Chat / etc.

---

## MESSAGE FLOW

Inbound message:
→ normalize into envelope
→ resolve agent (channel + sender binding)
→ derive session key
→ load session
→ append message
→ run agent loop
→ stream response
→ deliver back to origin

---

## REALTIME API

### WebSocket (primary)

* streaming tokens
* tool events
* session updates
* presence

### HTTP (secondary)

* RPC calls
* config access
* health checks
* webhooks at /gateway/webhook/

---

## PLUGIN SYSTEM

* manifest-driven
* supports:

  * npm packages
  * local extensions
* auto-discovery
* safe failure (skip broken plugins)

---

## LSP INTEGRATION

* spawn language servers (gopls, tsserver, etc.)
* watch filesystem
* expose diagnostics tool to agents
* degrade gracefully if server fails

---

## FAILURE HANDLING

* channel disconnect → queue + retry
* tool timeout → escalate to user
* missing session → create new
* config corruption → rollback
* plugin failure → isolate + log

---

# 2. FORGE TUI (Go)

## Stack

* Bubble Tea
* Lipgloss
* Glamour
* Cobra + Viper
* SQLite (local cache optional)

---

## MODES

### Connected Mode (default)

* connects to Forge Core via WebSocket

### Standalone Mode

* local execution fallback (no Core)

---

## UI LAYOUT

Header:

* repo name
* working directory
* active agent + model

Left Sidebar (collapsible):

* sessions list

Main Panel:

* scrollable messages
* markdown rendering with syntax highlighting

Bottom Panel:

* multi-line editor

Overlays:

* model picker
* agent switcher
* command palette
* permission dialogs
* logs viewer
* theme selector

Responsive to terminal resizing.

---

## THEMES

Include:

* OpenForge (custom palette)
* Catppuccin
* Dracula
* Gruvbox
* TokyoNight
* Monokai

Support light/dark variants.

---

## KEYBINDINGS

Ctrl+C → quit
Ctrl+O → model picker
Ctrl+K → command palette
Ctrl+N → new session
Ctrl+X → cancel agent
Ctrl+L → logs
Ctrl+S → send
Ctrl+E → external editor
i → focus editor
Esc → blur
? → help

---

## FEATURES

* streaming responses
* inline tool execution feedback
* interactive permission dialogs
* session switching
* command palette with custom commands

---

## CUSTOM COMMANDS

Load from:
~/.config/openforge/commands/
.project/.openforge/commands/

Format: Markdown with placeholders:
$VARIABLE_NAME

Prompt user when executed.

---

## NON-INTERACTIVE MODE

openforge run -p "your prompt"

* no TUI
* no permission prompts
* outputs plain text or JSON

---

# 3. INTEGRATION

* TUI connects to Core via WebSocket
* shares:

  * sessions
  * agents
  * tools
* fallback to standalone if Core unavailable

---

# 4. SECURITY

* pairing flow for unknown users
* allowlists per channel
* group chat mention gating
* sandbox for unsafe tool execution:

  * Docker or SSH

---

# 5. COMPLETION REQUIREMENTS

You are NOT done until:

1. Core runs without crashing:
   openforge core

2. TUI connects and works:
   openforge tui

3. Streaming responses function correctly

4. Tool calls execute with permission flow

5. Sessions persist and reload

6. At least one channel plugin works

7. Non-interactive mode works:
   openforge run -p "say hello"

8. End-to-end behavior is verified (not just compilation)

---

# OUTPUT EXPECTATION

Produce:

* full project structure
* working code (not pseudo-code)
* minimal but functional implementations
* clear separation of concerns
* ability to run immediately after install

Avoid:

* mock-only systems
* dead code paths
* incomplete integrations

---

Build OpenForge as a **real, runnable system**, not a conceptual demo.
