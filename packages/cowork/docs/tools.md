# Agent Tools Reference

The Kuse Cowork agent has access to a set of built-in tools it can invoke to interact with the file system, run commands, and search codebases. Tools are defined in `src-tauri/src/tools/`.

---

## File System Tools

### `file_read`

Read the contents of a file.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | string | ✅ | Absolute or project-relative path to the file |

Returns the file contents as a string. Returns an error if the file does not exist.

---

### `file_write`

Write (or create) a file with the given content.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | string | ✅ | Path to write to |
| `content` | string | ✅ | Content to write |

Overwrites the file if it already exists. Creates intermediate directories as needed.

---

### `file_edit`

Apply a targeted search-and-replace patch to an existing file.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | string | ✅ | Path to the file to edit |
| `old_content` | string | ✅ | Exact text to search for |
| `new_content` | string | ✅ | Text to replace it with |

The match must be unique within the file. Use `file_write` to replace entire files.

---

### `list_dir`

List the contents of a directory.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | string | ✅ | Directory path |

Returns a list of entries with their names and types (file / directory).

---

## Search Tools

### `glob`

Find files matching a glob pattern.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `pattern` | string | ✅ | Glob pattern (e.g. `**/*.rs`, `src/**/*.ts`) |
| `cwd` | string | — | Base directory for the pattern (defaults to project path) |

Returns a list of matching file paths.

---

### `grep`

Search for a regex pattern within files.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `pattern` | string | ✅ | Regex pattern to search for |
| `path` | string | — | File or directory to search (defaults to project path) |
| `file_pattern` | string | — | Glob filter for which files to search (e.g. `*.ts`) |
| `case_sensitive` | boolean | — | Whether the search is case-sensitive (default: `false`) |

Returns matching lines with file path and line number.

---

## Execution Tools

### `bash`

Execute a shell command on the host.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `command` | string | ✅ | Shell command to run |
| `cwd` | string | — | Working directory (defaults to project path) |
| `timeout` | integer | — | Timeout in seconds (default: 60, max: 300) |

**Blocked patterns** — the following are rejected for safety:

```
rm -rf /        rm -rf /*       :(){ :|:& };:
> /dev/sda      mkfs.           dd if=
wget | sh       curl | sh       wget | bash    curl | bash
```

Commands run with a timeout and the output (stdout + stderr) is returned.

---

## Docker Tools

Docker tools require Docker Desktop to be installed and running.

### `docker_run`

Run a command inside a fresh Docker container (container is removed after execution).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `image` | string | ✅ | Docker image (default suggestions: `python:3.11-alpine`, `ubuntu:latest`, `node:20`, `rust:alpine`) |
| `command` | string | ✅ | Command to run inside the container |
| `workdir` | string | — | Working directory inside the container (default: `/workspace`) |
| `mounts` | string[] | — | Volume mounts in `host_path:container_path` format |

---

### `docker_list`

List Docker containers.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `all` | boolean | — | Include stopped containers (default: `false`) |

---

### `docker_images`

List locally available Docker images. No parameters required.

---

## MCP Tools

In addition to built-in tools, the agent gains access to any tools exposed by connected **MCP servers**. These are registered dynamically at runtime and appear alongside the built-in tools in the agent's tool list.

See [mcp.md](mcp.md) for details on configuring MCP servers.

---

## Tool Security Notes

- All file system tools operate within the **project path** boundary set when creating a task.
- The `bash` tool blocks known destructive patterns before execution.
- `docker_run` provides an additional isolation layer — prefer it over `bash` for untrusted or side-effecting code.
- Tool results (including errors) are returned to the LLM as `tool_result` content blocks, allowing the agent to reason about failures and retry.
