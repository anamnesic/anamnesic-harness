# ThinkCoffee VS Code Extension

VS Code sidebar for managing project context. Integrates with the same local database used by MCP server and CLI.

## Status

Scaffold implementation. Core functionality:

- Activity bar icon with sidebar panels (Projects, Context, Decisions)
- Tree view showing projects with their context entries and decisions
- Commands for adding context, recording decisions, exporting, and syncing
- One-click sync to Copilot/Claude/Cursor config files

## Build

```bash
cd packages/vscode
pnpm build
npx vsce package
```

Install the generated `.vsix` from VS Code Extensions sidebar ("Install from VSIX...").

## Commands

| Command                          | Description                              |
| -------------------------------- | ---------------------------------------- |
| `ThinkCoffee: Refresh Projects`  | Refresh the project tree                 |
| `ThinkCoffee: Add Context Entry` | Add context to a project                 |
| `ThinkCoffee: Record Decision`   | Record an architectural decision         |
| `ThinkCoffee: Sync to AI Tools`  | Write copilot/claude/cursor config files |
| `ThinkCoffee: Export Context`    | Export and preview in a new editor tab   |

## Data

Shares `~/.thinkcoffee/data.sqlite` with CLI and MCP server. Changes made in any interface are immediately visible in the others.
