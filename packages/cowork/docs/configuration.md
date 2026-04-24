# Configuration

## Settings Overview

All settings are persisted locally in the SQLite database. They are accessible via **Settings** (gear icon in the sidebar).

---

## AI Provider & Model

### Supported Providers

| Provider ID | Name | API Format | Auth |
|---|---|---|---|
| `anthropic` | Anthropic (Claude) | Anthropic Messages API | `x-api-key` header |
| `openai` | OpenAI | OpenAI Chat Completions | Bearer token |
| `openai-compatible` | OpenAI-compatible (Groq, Together, etc.) | OpenAI Chat Completions | Bearer token |
| `openai-responses` | OpenAI Responses API | OpenAI Responses | Bearer token |
| `google` | Google Gemini | Gemini API | `x-goog-api-key` |
| `minimax` | MiniMax | MiniMax API | Bearer token |
| `ollama` | Ollama (local) | OpenAI-compatible | None |
| `openrouter` | OpenRouter | OpenAI-compatible | Bearer token |
| `vscode` | VS Code LLM (GitHub Copilot) | Anthropic-compatible | None (local proxy) |

The provider is **auto-detected** from the model name if not explicitly set:

| Model prefix | Inferred provider |
|---|---|
| `claude-*` | `anthropic` |
| `gpt-*`, `o1-*`, `o3-*` | `openai` |
| `gemini-*` | `google` |
| `minimax-*` | `minimax` |
| `anthropic/*`, `openai/*`, `meta-llama/*`, `deepseek/*` | `openrouter` |
| `model:tag` (colon format) | `ollama` |

### Provider-Specific Keys

Multiple provider keys can be stored simultaneously. The correct key is selected automatically based on the active provider:

```jsonc
// Stored in DB as JSON
{
  "provider_keys": {
    "anthropic": "sk-ant-...",
    "openai": "sk-...",
    "openrouter": "sk-or-..."
  }
}
```

### Settings Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `claude-sonnet-4-20250514` | Model identifier |
| `base_url` | `string` | `https://api.anthropic.com` | Provider API base URL |
| `max_tokens` | `number` | `4096` | Maximum tokens per response |
| `temperature` | `number` | `0.7` | Sampling temperature (0–1) |
| `provider` | `string` | auto-detect | Provider ID (set explicitly to override auto-detection) |
| `provider_keys` | `object` | `{}` | Map of provider ID → API key |
| `openai_organization` | `string?` | — | OpenAI Organization ID (optional) |
| `openai_project` | `string?` | — | OpenAI Project ID (optional) |

---

## Local Model Configuration (Ollama)

To use a local model via Ollama:

1. Install and start [Ollama](https://ollama.ai/).
2. Pull a model: `ollama pull llama3.3:latest`
3. In **Settings**, set:
   - **Base URL**: `http://localhost:11434`
   - **Model**: `llama3.3:latest` (or any `name:tag` format)
   - **API Key**: leave empty (no auth needed)

---

## VS Code LLM / GitHub Copilot

When running the VS Code LLM provider proxy (port 3456):

1. Set **Base URL** to `http://localhost:3456`.
2. Select a model from the `vscode` group (e.g., `claude-sonnet-4.6`, `claude-haiku-4.5`).
3. No API key required — authentication is handled by the VS Code extension.

---

## OpenAI-Compatible Providers

For services that implement the OpenAI Chat Completions API (Groq, Together AI, Fireworks, etc.):

1. Set **Base URL** to the provider's endpoint (e.g., `https://api.groq.com/openai/v1`).
2. Enter the provider API key.
3. Select the appropriate model name.

---

## Docker Configuration

Docker is used to provide container isolation for the `bash` tool. Kuse Cowork connects to the Docker daemon via the local socket — no additional configuration is required beyond having Docker Desktop installed and running.

If Docker is unavailable, bash commands fall back to direct host execution.

---

## MCP Server Configuration

MCP servers are configured through the **MCP** panel in the sidebar. See [mcp.md](mcp.md) for full details.

---

## Tauri App Configuration (`tauri.conf.json`)

Located at `src-tauri/tauri.conf.json`. Key fields:

| Field | Value | Notes |
|---|---|---|
| `productName` | `kuse-cowork` | Application name |
| `version` | `0.1.0` | App version |
| `bundle.identifier` | `com.kuse.cowork` | Unique app bundle ID |
| `app.windows[0].width` | `1200` | Default window width |
| `app.windows[0].height` | `800` | Default window height |

---

## Capability Permissions (`capabilities/default.json`)

Controls what OS APIs the WebView can access:

```json
{
  "permissions": [
    "core:default",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-emit",
    "shell:allow-open",
    "dialog:default",
    "dialog:allow-open"
  ]
}
```

The frontend can open URLs in the system browser (`shell:allow-open`) and open file/folder dialogs (`dialog:allow-open`). All other OS access happens through explicit Tauri IPC commands on the Rust side.
