---
summary: "CLI reference for `kairos tui` (Gateway-backed or local embedded terminal UI)"
read_when:
  - You want a terminal UI for the Gateway (remote-friendly)
  - You want to pass url/token/session from scripts
  - You want to run the TUI in local embedded mode without a Gateway
  - You want to use kairos chat or kairos tui --local
title: "TUI"
---

# `kairos tui`

Open the terminal UI connected to the Gateway, or run it in local embedded
mode.

Related:

- TUI guide: [TUI](/web/tui)

Notes:

- `chat` and `terminal` are aliases for `kairos tui --local`.
- `--local` cannot be combined with `--url`, `--token`, or `--password`.
- `tui` resolves configured gateway auth SecretRefs for token/password auth when possible (`env`/`file`/`exec` providers).
- When launched from inside a configured agent workspace directory, TUI auto-selects that agent for the session key default (unless `--session` is explicitly `agent:<id>:...`).
- Local mode uses the embedded agent runtime directly. Most local tools work, but Gateway-only features are unavailable.
- Local mode adds `/auth [provider]` inside the TUI command surface.
- Plugin approval gates still apply in local mode. Tools that require approval prompt for a decision in the terminal; nothing is silently auto-approved because the Gateway is not involved.

## Examples

```bash
kairos chat
kairos tui --local
kairos tui
kairos tui --url ws://127.0.0.1:18789 --token <token>
kairos tui --session main --deliver
kairos chat --message "Compare my config to the docs and tell me what to fix"
# when run inside an agent workspace, infers that agent automatically
kairos tui --session bugfix
```

## Config repair loop

Use local mode when the current config already validates and you want the
embedded agent to inspect it, compare it against the docs, and help repair it
from the same terminal:

If `kairos config validate` is already failing, use `kairos configure` or
`kairos doctor --fix` first. `kairos chat` does not bypass the invalid-
config guard.

```bash
kairos chat
```

Then inside the TUI:

```text
!kairos config file
!kairos docs gateway auth token secretref
!kairos config validate
!kairos doctor
```

Apply targeted fixes with `kairos config set` or `kairos configure`, then
rerun `kairos config validate`. See [TUI](/web/tui) and [Config](/cli/config).

## Related

- [CLI reference](/cli)
- [TUI](/web/tui)
