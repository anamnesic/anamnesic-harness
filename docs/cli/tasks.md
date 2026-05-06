---
summary: "CLI reference for `kairos tasks` (background task ledger and Task Flow state)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `kairos tasks flow`
title: "`kairos tasks`"
---

Inspect durable background tasks and Task Flow state. With no subcommand,
`kairos tasks` is equivalent to `kairos tasks list`.

See [Background Tasks](/automation/tasks) for the lifecycle and delivery model.

## Usage

```bash
kairos tasks
kairos tasks list
kairos tasks list --runtime acp
kairos tasks list --status running
kairos tasks show <lookup>
kairos tasks notify <lookup> state_changes
kairos tasks cancel <lookup>
kairos tasks audit
kairos tasks maintenance
kairos tasks maintenance --apply
kairos tasks flow list
kairos tasks flow show <lookup>
kairos tasks flow cancel <lookup>
```

## Root Options

- `--json`: output JSON.
- `--runtime <name>`: filter by kind: `subagent`, `acp`, `cron`, or `cli`.
- `--status <name>`: filter by status: `queued`, `running`, `succeeded`, `failed`, `timed_out`, `cancelled`, or `lost`.

## Subcommands

### `list`

```bash
kairos tasks list [--runtime <name>] [--status <name>] [--json]
```

Lists tracked background tasks newest first.

### `show`

```bash
kairos tasks show <lookup> [--json]
```

Shows one task by task ID, run ID, or session key.

### `notify`

```bash
kairos tasks notify <lookup> <done_only|state_changes|silent>
```

Changes the notification policy for a running task.

### `cancel`

```bash
kairos tasks cancel <lookup>
```

Cancels a running background task.

### `audit`

```bash
kairos tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

Surfaces stale, lost, delivery-failed, or otherwise inconsistent task and Task Flow records. Lost tasks retained until `cleanupAfter` are warnings; expired or unstamped lost tasks are errors.

### `maintenance`

```bash
kairos tasks maintenance [--apply] [--json]
```

Previews or applies task and Task Flow reconciliation, cleanup stamping, and pruning.
For cron tasks, reconciliation uses persisted run logs/job state before marking an
old active task `lost`, so completed cron runs do not become false audit errors
just because the in-memory Gateway runtime state is gone. Offline CLI audit is
not authoritative for the Gateway's process-local cron active-job set.

### `flow`

```bash
kairos tasks flow list [--status <name>] [--json]
kairos tasks flow show <lookup> [--json]
kairos tasks flow cancel <lookup>
```

Inspects or cancels durable Task Flow state under the task ledger.

## Related

- [CLI reference](/cli)
- [Background tasks](/automation/tasks)
