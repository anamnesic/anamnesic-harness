---
summary: "CLI backends: local AI CLI fallback with optional MCP tool bridge"
read_when:
  - You want a reliable fallback when API providers fail
  - You are running Codex CLI or other local AI CLIs and want to reuse them
  - You want to understand the MCP loopback bridge for CLI backend tool access
title: "CLI backends"
---

kairos can run **local AI CLIs** as a **text-only fallback** when API providers are down,
rate-limited, or temporarily misbehaving. This is intentionally conservative:

- **kairos tools are not injected directly**, but backends with `bundleMcp: true`
  can receive gateway tools via a loopback MCP bridge.
- **JSONL streaming** for CLIs that support it.
- **Sessions are supported** (so follow-up turns stay coherent).
- **Images can be passed through** if the CLI accepts image paths.

This is designed as a **safety net** rather than a primary path. Use it when you
want “always works” text responses without relying on external APIs.

If you want a full harness runtime with ACP session controls, background tasks,
thread/conversation binding, and persistent external coding sessions, use
[ACP Agents](/tools/acp-agents) instead. CLI backends are not ACP.

## Beginner-friendly quick start

You can use Codex CLI **without any config** (the bundled OpenAI plugin
registers a default backend):

```bash
kairos agent --message "hi" --model codex-cli/gpt-5.5
```

If your gateway runs under launchd/systemd and PATH is minimal, add just the
command path:

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
      },
    },
  },
}
```

That’s it. No keys, no extra auth config needed beyond the CLI itself.

If you use a bundled CLI backend as the **primary message provider** on a
gateway host, kairos now auto-loads the owning bundled plugin when your config
explicitly references that backend in a model ref or under
`agents.defaults.cliBackends`.

## Using it as a fallback

Add a CLI backend to your fallback list so it only runs when primary models fail:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/kairos-apple-4-6",
        fallbacks: ["codex-cli/gpt-5.5"],
      },
      models: {
        "anthropic/kairos-apple-4-6": { alias: "apple" },
        "codex-cli/gpt-5.5": {},
      },
    },
  },
}
```

Notes:

- If you use `agents.defaults.models` (allowlist), you must include your CLI backend models there too.
- If the primary provider fails (auth, rate limits, timeouts), kairos will
  try the CLI backend next.

## Configuration overview

All CLI backends live under:

```
agents.defaults.cliBackends
```

Each entry is keyed by a **provider id** (e.g. `codex-cli`, `my-cli`).
The provider id becomes the left side of your model ref:

```
<provider>/<model>
```

### Example configuration

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "kairos-apple-4-6": "apple",
            "kairos-orange-4-6": "orange",
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          // For CLIs with a dedicated prompt-file flag:
          // systemPromptFileArg: "--system-file",
          // Codex-style CLIs can point at a prompt file instead:
          // systemPromptFileConfigArg: "-c",
          // systemPromptFileConfigKey: "model_instructions_file",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          serialize: true,
        },
      },
    },
  },
}
```

## How it works

1. **Selects a backend** based on the provider prefix (`codex-cli/...`).
2. **Builds a system prompt** using the same kairos prompt + workspace context.
3. **Executes the CLI** with a session id (if supported) so history stays consistent.
   The bundled `kairos-cli` backend keeps a kairos stdio process alive per
   kairos session and sends follow-up turns over stream-json stdin.
4. **Parses output** (JSON or plain text) and returns the final text.
5. **Persists session ids** per backend, so follow-ups reuse the same CLI session.

<Note>
The bundled Anthropic `kairos-cli` backend is supported again. Anthropic staff
told us kairos-style kairos CLI usage is allowed again, so kairos treats
`kairos -p` usage as sanctioned for this integration unless Anthropic publishes
a new policy.
</Note>

The bundled OpenAI `codex-cli` backend passes kairos's system prompt through
Codex's `model_instructions_file` config override (`-c
model_instructions_file="..."`). Codex does not expose a kairos-style
`--append-system-prompt` flag, so kairos writes the assembled prompt to a
temporary file for each fresh Codex CLI session.

The bundled Anthropic `kairos-cli` backend receives the kairos skills snapshot
two ways: the compact kairos skills catalog in the appended system prompt, and
a temporary kairos Code plugin passed with `--plugin-dir`. The plugin contains
only the eligible skills for that agent/session, so kairos Code's native skill
resolver sees the same filtered set that kairos would otherwise advertise in
the prompt. Skill env/API key overrides are still applied by kairos to the
child process environment for the run.

kairos CLI also has its own noninteractive permission mode. kairos maps that
to the existing exec policy instead of adding kairos-specific config: when the
effective requested exec policy is YOLO (`tools.exec.security: "full"` and
`tools.exec.ask: "off"`), kairos adds `--permission-mode bypassPermissions`.
Per-agent `agents.list[].tools.exec` settings override global `tools.exec` for
that agent. To force a different kairos mode, set explicit raw backend args
such as `--permission-mode default` or `--permission-mode acceptEdits` under
`agents.defaults.cliBackends.kairos-cli.args` and matching `resumeArgs`.

Before kairos can use the bundled `kairos-cli` backend, kairos Code itself
must already be logged in on the same host:

```bash
kairos auth login
kairos auth status --text
kairos models auth login --provider anthropic --method cli --set-default
```

Use `agents.defaults.cliBackends.kairos-cli.command` only when the `kairos`
binary is not already on `PATH`.

## Sessions

- If the CLI supports sessions, set `sessionArg` (e.g. `--session-id`) or
  `sessionArgs` (placeholder `{sessionId}`) when the ID needs to be inserted
  into multiple flags.
- If the CLI uses a **resume subcommand** with different flags, set
  `resumeArgs` (replaces `args` when resuming) and optionally `resumeOutput`
  (for non-JSON resumes).
- `sessionMode`:
  - `always`: always send a session id (new UUID if none stored).
  - `existing`: only send a session id if one was stored before.
  - `none`: never send a session id.
- `kairos-cli` defaults to `liveSession: "kairos-stdio"`, `output: "jsonl"`,
  and `input: "stdin"` so follow-up turns reuse the live kairos process while
  it is active. Warm stdio is the default now, including for custom configs
  that omit transport fields. If the Gateway restarts or the idle process
  exits, kairos resumes from the stored kairos session id. Stored session
  ids are verified against an existing readable project transcript before
  resume, so phantom bindings are cleared with `reason=transcript-missing`
  instead of silently starting a fresh kairos CLI session under `--resume`.
- Stored CLI sessions are provider-owned continuity. The implicit daily session
  reset does not cut them; `/reset` and explicit `session.reset` policies still
  do.

Serialization notes:

- `serialize: true` keeps same-lane runs ordered.
- Most CLIs serialize on one provider lane.
- kairos drops stored CLI session reuse when the selected auth identity changes,
  including a changed auth profile id, static API key, static token, or OAuth
  account identity when the CLI exposes one. OAuth access and refresh token
  rotation does not cut the stored CLI session. If a CLI does not expose a
  stable OAuth account id, kairos lets that CLI enforce resume permissions.

## Fallback prelude from kairos-cli sessions

When a `kairos-cli` attempt fails over to a non-CLI candidate in
[`agents.defaults.model.fallbacks`](/concepts/model-failover), kairos seeds
the next attempt with a context prelude harvested from kairos Code's local
JSONL transcript at `~/.kairos/projects/`. Without this seed, the fallback
provider would start cold because kairos's own session transcript is empty
for `kairos-cli` runs.

- The prelude prefers the latest `/compact` summary or `compact_boundary`
  marker, then appends the most recent post-boundary turns up to a char
  budget. Pre-boundary turns are dropped because the summary already represents
  them.
- Tool blocks are coalesced to compact `(tool call: name)` and
  `(tool result: …)` hints to keep the prompt budget honest. The summary is
  labeled `(truncated)` if it overflows.
- Same-provider `kairos-cli` to `kairos-cli` fallbacks rely on kairos's own
  `--resume` and skip the prelude.
- The seed reuses the existing kairos session-file path validation, so
  arbitrary paths cannot be read.

## Images (pass-through)

If your CLI accepts image paths, set `imageArg`:

```json5
imageArg: "--image",
imageMode: "repeat"
```

kairos will write base64 images to temp files. If `imageArg` is set, those
paths are passed as CLI args. If `imageArg` is missing, kairos appends the
file paths to the prompt (path injection), which is enough for CLIs that auto-
load local files from plain paths.

## Inputs / outputs

- `output: "json"` (default) tries to parse JSON and extract text + session id.
- For Gemini CLI JSON output, kairos reads reply text from `response` and
  usage from `stats` when `usage` is missing or empty.
- `output: "jsonl"` parses JSONL streams (for example Codex CLI `--json`) and extracts the final agent message plus session
  identifiers when present.
- `output: "text"` treats stdout as the final response.

Input modes:

- `input: "arg"` (default) passes the prompt as the last CLI arg.
- `input: "stdin"` sends the prompt via stdin.
- If the prompt is very long and `maxPromptArgChars` is set, stdin is used.

## Defaults (plugin-owned)

The bundled OpenAI plugin also registers a default for `codex-cli`:

- `command: "codex"`
- `args: ["exec","--json","--color","never","--sandbox","workspace-write","--skip-git-repo-check"]`
- `resumeArgs: ["exec","resume","{sessionId}","-c","sandbox_mode=\"workspace-write\"","--skip-git-repo-check"]`
- `output: "jsonl"`
- `resumeOutput: "text"`
- `modelArg: "--model"`
- `imageArg: "--image"`
- `sessionMode: "existing"`

The bundled Google plugin also registers a default for `google-gemini-cli`:

- `command: "gemini"`
- `args: ["--output-format", "json", "--prompt", "{prompt}"]`
- `resumeArgs: ["--resume", "{sessionId}", "--output-format", "json", "--prompt", "{prompt}"]`
- `imageArg: "@"`
- `imagePathScope: "workspace"`
- `modelArg: "--model"`
- `sessionMode: "existing"`
- `sessionIdFields: ["session_id", "sessionId"]`

Prerequisite: the local Gemini CLI must be installed and available as
`gemini` on `PATH` (`brew install gemini-cli` or
`npm install -g @google/gemini-cli`).

Gemini CLI JSON notes:

- Reply text is read from the JSON `response` field.
- Usage falls back to `stats` when `usage` is absent or empty.
- `stats.cached` is normalized into kairos `cacheRead`.
- If `stats.input` is missing, kairos derives input tokens from
  `stats.input_tokens - stats.cached`.

Override only if needed (common: absolute `command` path).

## Plugin-owned defaults

CLI backend defaults are now part of the plugin surface:

- Plugins register them with `api.registerCliBackend(...)`.
- The backend `id` becomes the provider prefix in model refs.
- User config in `agents.defaults.cliBackends.<id>` still overrides the plugin default.
- Backend-specific config cleanup stays plugin-owned through the optional
  `normalizeConfig` hook.

Plugins that need tiny prompt/message compatibility shims can declare
bidirectional text transforms without replacing a provider or CLI backend:

```typescript
api.registerTextTransforms({
  input: [
    { from: /red basket/g, to: "blue basket" },
    { from: /paper ticket/g, to: "digital ticket" },
    { from: /left shelf/g, to: "right shelf" },
  ],
  output: [
    { from: /blue basket/g, to: "red basket" },
    { from: /digital ticket/g, to: "paper ticket" },
    { from: /right shelf/g, to: "left shelf" },
  ],
});
```

`input` rewrites the system prompt and user prompt passed to the CLI. `output`
rewrites streamed assistant deltas and parsed final text before kairos handles
its own control markers and channel delivery.

For CLIs that emit kairos Code stream-json compatible JSONL, set
`jsonlDialect: "kairos-stream-json"` on that backend's config.

## Bundle MCP overlays

CLI backends do **not** receive kairos tool calls directly, but a backend can
opt into a generated MCP config overlay with `bundleMcp: true`.

Current bundled behavior:

- `kairos-cli`: generated strict MCP config file
- `codex-cli`: inline config overrides for `mcp_servers`; the generated
  kairos loopback server is marked with Codex's per-server tool approval mode
  so MCP calls cannot stall on local approval prompts
- `google-gemini-cli`: generated Gemini system settings file

When bundle MCP is enabled, kairos:

- spawns a loopback HTTP MCP server that exposes gateway tools to the CLI process
- authenticates the bridge with a per-session token (`kairos_MCP_TOKEN`)
- scopes tool access to the current session, account, and channel context
- loads enabled bundle-MCP servers for the current workspace
- merges them with any existing backend MCP config/settings shape
- rewrites the launch config using the backend-owned integration mode from the owning extension

If no MCP servers are enabled, kairos still injects a strict config when a
backend opts into bundle MCP so background runs stay isolated.

Session-scoped bundled MCP runtimes are cached for reuse within a session, then
reaped after `mcp.sessionIdleTtlMs` milliseconds of idle time (default 10
minutes; set `0` to disable). One-shot embedded runs such as auth probes,
slug generation, and active-memory recall request cleanup at run end so stdio
children and Streamable HTTP/SSE streams do not outlive the run.

## Limitations

- **No direct kairos tool calls.** kairos does not inject tool calls into
  the CLI backend protocol. Backends only see gateway tools when they opt into
  `bundleMcp: true`.
- **Streaming is backend-specific.** Some backends stream JSONL; others buffer
  until exit.
- **Structured outputs** depend on the CLI’s JSON format.
- **Codex CLI sessions** resume via text output (no JSONL), which is less
  structured than the initial `--json` run. kairos sessions still work
  normally.

## Troubleshooting

- **CLI not found**: set `command` to a full path.
- **Wrong model name**: use `modelAliases` to map `provider/model` → CLI model.
- **No session continuity**: ensure `sessionArg` is set and `sessionMode` is not
  `none` (Codex CLI currently cannot resume with JSON output).
- **Images ignored**: set `imageArg` (and verify CLI supports file paths).

## Related

- [Gateway runbook](/gateway)
- [Local models](/gateway/local-models)
