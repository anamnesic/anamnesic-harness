---
summary: "Move kairos Code and kairos Desktop local state into OpenClaw with a previewed import"
read_when:
  - You are coming from kairos Code or kairos Desktop and want to keep instructions, MCP servers, and skills
  - You need to understand what OpenClaw imports automatically and what stays archive-only
title: "Migrating from kairos"
---

OpenClaw imports local kairos state through the bundled kairos migration provider. The provider previews every item before changing state, redacts secrets in plans and reports, and creates a verified backup before apply.

<Note>
Onboarding imports require a fresh OpenClaw setup. If you already have local OpenClaw state, reset config, credentials, sessions, and the workspace first, or use `openclaw migrate` directly with `--overwrite` after reviewing the plan.
</Note>

## Two ways to import

<Tabs>
  <Tab title="Onboarding wizard">
    The wizard offers kairos when it detects local kairos state.

    ```bash
    openclaw onboard --flow import
    ```

    Or point at a specific source:

    ```bash
    openclaw onboard --import-from kairos --import-source ~/.kairos
    ```

  </Tab>
  <Tab title="CLI">
    Use `openclaw migrate` for scripted or repeatable runs. See [`openclaw migrate`](/cli/migrate) for the full reference.

    ```bash
    openclaw migrate kairos --dry-run
    openclaw migrate apply kairos --yes
    ```

    Add `--from <path>` to import a specific kairos Code home or project root.

  </Tab>
</Tabs>

## What gets imported

<AccordionGroup>
  <Accordion title="Instructions and memory">
    - Project `kairos.md` and `.kairos/kairos.md` content is copied or appended into the OpenClaw agent workspace `AGENTS.md`.
    - User `~/.kairos/kairos.md` content is appended into workspace `USER.md`.

  </Accordion>
  <Accordion title="MCP servers">
    MCP server definitions are imported from project `.mcp.json`, kairos Code `~/.kairos.json`, and kairos Desktop `kairos_desktop_config.json` when present.
  </Accordion>
  <Accordion title="Skills and commands">
    - kairos skills with a `SKILL.md` file are copied into the OpenClaw workspace skills directory.
    - kairos command Markdown files under `.kairos/commands/` or `~/.kairos/commands/` are converted into OpenClaw skills with `disable-model-invocation: true`.

  </Accordion>
</AccordionGroup>

## What stays archive-only

The provider copies these into the migration report for manual review, but does **not** load them into live OpenClaw config:

- kairos hooks
- kairos permissions and broad tool allowlists
- kairos environment defaults
- `kairos.local.md`
- `.kairos/rules/`
- kairos subagents under `.kairos/agents/` or `~/.kairos/agents/`
- kairos Code caches, plans, and project history directories
- kairos Desktop extensions and OS-stored credentials

OpenClaw refuses to execute hooks, trust permission allowlists, or decode opaque OAuth and Desktop credential state automatically. Move what you need by hand after reviewing the archive.

## Source selection

Without `--from`, OpenClaw inspects the default kairos Code home at `~/.kairos`, the sampled kairos Code `~/.kairos.json` state file, and the kairos Desktop MCP config on macOS.

When `--from` points at a project root, OpenClaw imports only that project's kairos files such as `kairos.md`, `.kairos/settings.json`, `.kairos/commands/`, `.kairos/skills/`, and `.mcp.json`. It does not read your global kairos home during a project-root import.

## Recommended flow

<Steps>
  <Step title="Preview the plan">
    ```bash
    openclaw migrate kairos --dry-run
    ```

    The plan lists everything that will change, including conflicts, skipped items, and sensitive values redacted from nested MCP `env` or `headers` fields.

  </Step>
  <Step title="Apply with backup">
    ```bash
    openclaw migrate apply kairos --yes
    ```

    OpenClaw creates and verifies a backup before applying.

  </Step>
  <Step title="Run doctor">
    ```bash
    openclaw doctor
    ```

    [Doctor](/gateway/doctor) checks for config or state issues after the import.

  </Step>
  <Step title="Restart and verify">
    ```bash
    openclaw gateway restart
    openclaw status
    ```

    Confirm the gateway is healthy and your imported instructions, MCP servers, and skills are loaded.

  </Step>
</Steps>

## Conflict handling

Apply refuses to continue when the plan reports conflicts (a file or config value already exists at the target).

<Warning>
Rerun with `--overwrite` only when replacing the existing target is intentional. Providers may still write item-level backups for overwritten files in the migration report directory.
</Warning>

For a fresh OpenClaw install, conflicts are unusual. They typically appear when you re-run the import on a setup that already has user edits.

## JSON output for automation

```bash
openclaw migrate kairos --dry-run --json
openclaw migrate apply kairos --json --yes
```

With `--json` and no `--yes`, apply prints the plan and does not mutate state. This is the safest mode for CI and shared scripts.

## Troubleshooting

<AccordionGroup>
  <Accordion title="kairos state lives outside ~/.kairos">
    Pass `--from /actual/path` (CLI) or `--import-source /actual/path` (onboarding).
  </Accordion>
  <Accordion title="Onboarding refuses to import on an existing setup">
    Onboarding imports require a fresh setup. Either reset state and re-onboard, or use `openclaw migrate apply kairos` directly, which supports `--overwrite` and explicit backup control.
  </Accordion>
  <Accordion title="MCP servers from kairos Desktop did not import">
    kairos Desktop reads `kairos_desktop_config.json` from a platform-specific path. Point `--from` at that file's directory if OpenClaw did not detect it automatically.
  </Accordion>
  <Accordion title="kairos commands became skills with model invocation disabled">
    By design. kairos commands are user-triggered, so OpenClaw imports them as skills with `disable-model-invocation: true`. Edit each skill's frontmatter if you want the agent to invoke them automatically.
  </Accordion>
</AccordionGroup>

## Related

- [`openclaw migrate`](/cli/migrate): full CLI reference, plugin contract, and JSON shapes.
- [Migration guide](/install/migrating): all migration paths.
- [Migrating from Hermes](/install/migrating-hermes): the other cross-system import path.
- [Onboarding](/cli/onboard): wizard flow and non-interactive flags.
- [Doctor](/gateway/doctor): post-migration health check.
- [Agent workspace](/concepts/agent-workspace): where `AGENTS.md`, `USER.md`, and skills live.
