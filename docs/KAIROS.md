# KAIROS.md

This file provides guidance to Kairos Agent (chronokairo.com.br/kairos) when working with code in this repository.

## Common Commands

- **Build the Project:**
  ```sh
  npm run build
  ```

## Tests and Lint

- There is no repo-wide test or lint script at the root.
- See [testing.md](testing.md) for package-level commands (packages/nextjs, packages/vscode).

## Code Architecture

This codebase follows a modular architecture with key components organized as follows:
- **source/src:** Primary CLI runtime (extracted upstream source).
  - **bootstrap/**: Application startup logic.
  - **commands/**: Slash command implementations.
  - **components/**: React/Ink UI components.
  - **services/**: External API integrations and backend services.
  - **utils/**: Shared utilities.
  - **tasks/**: Background tasks and workflows.
- **providers/**: Provider plugins, each a self-contained package.
- **packages/vscode/**: VS Code extension.
- **packages/nextjs/**: Optional web UI.
- **dist/**: Generated bundle output.

## Relevant Guidance Files

- [../AGENTS.md](../AGENTS.md) - short map and entry points.
- [README.md](README.md) - documentation index.
- [rules.md](rules.md) - agent rules.
- [testing.md](testing.md) - test/lint commands by package.
- .kairos/agents/ - local agent prompt inventory.
