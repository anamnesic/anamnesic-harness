# ThinkCoffee

AI Context Management Platform. A centralized context layer that keeps your project knowledge consistent across all AI assistants (Copilot, Claude, Cursor, etc).

## The Problem

Developers lose ~30% productivity from context switching between AI tools. Each tool needs the same project context re-explained. Decisions get lost. Architecture drifts.

## The Solution

ThinkCoffee stores your project context once and distributes it to all your AI tools:

```
You --> ThinkCoffee --> .github/copilot-instructions.md  (GitHub Copilot)
                    --> CLAUDE.md                         (Claude)
                    --> .cursorrules                      (Cursor)
                    --> MCP Protocol                      (Any MCP client)
```

## Architecture

```
packages/
  core/         Shared library: entities, services, database, export logic
  mcp-server/   MCP server - AI tools query context directly via protocol
  cli/          CLI tool - manage context from the terminal
  vscode/       VS Code extension - sidebar UI for context management
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+

### Install & Build

```bash
pnpm install
pnpm build
```

### Option 1: MCP Server (recommended)

Connect ThinkCoffee to Claude, Copilot, Cursor, or any MCP-compatible tool.

Add to your MCP client config (e.g. VS Code `settings.json`, Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "thinkcoffee": {
      "command": "node",
      "args": ["/path/to/thinkcoffee/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Then ask your AI: "List my ThinkCoffee projects" or "Add architecture context for my project".

### Option 2: CLI

```bash
# Initialize in your project
think init

# Add context
think context add <projectId> "tech-stack" "React 18 + TypeScript + Tailwind" -c architecture

# Record a decision
think decision add <projectId> "Use PostgreSQL" "Chose Postgres over MongoDB for relational data integrity"

# Sync to all AI tools at once
think sync <projectId>
```

### Option 3: VS Code Extension

Build and install:

```bash
pnpm build:vscode
cd packages/vscode && npx vsce package
```

Install the `.vsix` from the Extensions sidebar.

## MCP Tools

The MCP server exposes these tools to AI clients:

| Tool              | Description                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `list_projects`   | List all projects                                                                  |
| `create_project`  | Create a new project                                                               |
| `get_project`     | Get full project details with context and decisions                                |
| `delete_project`  | Delete a project                                                                   |
| `add_context`     | Add a context entry (architecture, requirements, dependencies, standards, general) |
| `update_context`  | Update an existing context entry                                                   |
| `remove_context`  | Delete a context entry                                                             |
| `list_context`    | List context entries, optionally filtered by category                              |
| `search_context`  | Search context by keyword                                                          |
| `add_decision`    | Record an architectural decision                                                   |
| `update_decision` | Update a decision                                                                  |
| `remove_decision` | Delete a decision                                                                  |
| `list_decisions`  | List all decisions for a project                                                   |
| `export_context`  | Export in json, markdown, plain, copilot, claude, or cursor format                 |

## Export Formats

| Format     | Target File                       | Used By          |
| ---------- | --------------------------------- | ---------------- |
| `copilot`  | `.github/copilot-instructions.md` | GitHub Copilot   |
| `claude`   | `CLAUDE.md`                       | Claude Code      |
| `cursor`   | `.cursorrules`                    | Cursor           |
| `markdown` | `<project>-context.md`            | General use      |
| `json`     | `<project>-context.json`          | API integrations |
| `plain`    | `<project>-context.txt`           | Copy-paste       |

## Data Storage

All data is stored locally in `~/.thinkcoffee/data.sqlite`. No cloud, no accounts, no telemetry.

## Development

```bash
# Watch mode for core
pnpm dev:core

# Watch mode for MCP server
pnpm dev:mcp

# Watch mode for CLI
pnpm dev:cli

# Build everything
pnpm build
```

## License

MIT
