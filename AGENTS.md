# AGENTS.md

This repo treats code + docs/ as the source of truth. If you are unsure, start with docs/README.md.

## Entry points
- docs/README.md - documentation index and where to look next.
- README.md - project overview and provider list.
- INSTALL.md - install and verify steps.
- KAIROS.md - agent guidance and command hints.
- KAIROS_FEATURES_STATUS.md - feature gates and build flags.
- TODOCOPILOT.md - porting decisions and history.
- chronos.md - Chronos orchestration details.
- BUILD_REPORT.md - build notes and known issues.

## Key areas
- source/src - main CLI runtime (extracted upstream source).
- providers/* - provider plugins (each self-contained).
- packages/vscode - VS Code extension.
- packages/nextjs - Next.js UI (optional).
- dist/ - generated bundle output.
- .kairos/agents - local agent prompt inventory.

## Ops
- docs/observability.md - logs, metrics, traces.
- docs/worktrees.md - isolated worktree sessions.
- docs/architecture.md - layout and boundary rules.

## Índice de READMEs por Pasta

Cada pasta principal do repositório tem um `README.md` explicando seu conteúdo.
Use este índice para navegar rapidamente.

### Raiz do Repositório
| Pasta | README | O que contém |
|---|---|---|
| `apps/` | [apps/README.md](apps/README.md) | Aplicações cliente nativas (iOS, Android, shared kit) |
| `apps/android/` | [apps/android/README.md](apps/android/README.md) | App Android via Capacitor |
| `apps/ios/` | [apps/ios/README.md](apps/ios/README.md) | App iOS nativo em Swift |
| `apps/shared/` | [apps/shared/README.md](apps/shared/README.md) | Kit Swift compartilhado entre iOS e Android (OpenClawKit) |
| `assets/` | [assets/README.md](assets/README.md) | Assets visuais: logos, ícones, imagens de instalador |
| `docs/` | [docs/README.md](docs/README.md) | Documentação completa do projeto |
| `extensions/` | [extensions/README.md](extensions/README.md) | 120+ extensões: providers de IA, canais, ferramentas |
| `infra/` | [infra/README.md](infra/README.md) | Infraestrutura e deploy (SST/AWS, Fly.io, Render) |
| `nix/` | [nix/README.md](nix/README.md) | Builds reproduzíveis com Nix Flakes |
| `packages/` | [packages/README.md](packages/README.md) | Todos os pacotes internos do monorepo |
| `scripts/` | [scripts/README.md](scripts/README.md) | Scripts de release, changelog, versão, CI |
| `sdks/` | [sdks/README.md](sdks/README.md) | SDKs para plataformas externas |
| `src/` | [src/README.md](src/README.md) | Backend TypeScript: API, CLI, memória, interfaces |

### Pacotes (`packages/`)
| Pacote | README | O que contém |
|---|---|---|
| `packages/app/` | [packages/app/README.md](packages/app/README.md) | Web app Next.js + mobile Capacitor (UI principal) |
| `packages/brain/` | [packages/brain/README.md](packages/brain/README.md) | Documentação do módulo Brain |
| `packages/core/` | [packages/core/README.md](packages/core/README.md) | Lógica de agentes reutilizável (core) |
| `packages/devtools/` | [packages/devtools/README.md](packages/devtools/README.md) | Ferramentas de CI, release, scripts, QA |
| `packages/editor/` | [packages/editor/README.md](packages/editor/README.md) | Extensão VS Code do Kairos |
| `packages/kairoscode/` | [packages/kairoscode/README.md](packages/kairoscode/README.md) | Runtime principal: CLI, servidor, TUI, storage |
| `packages/sdk/` | [packages/sdk/README.md](packages/sdk/README.md) | SDK público do Kairos (`@kairos/sdk`) |
| `packages/vault/` | [packages/vault/README.md](packages/vault/README.md) | Vault criptografado AES-256-GCM |




- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `dev`.
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream
- In `src/config`, follow the existing self-export pattern at the top of the file (for example `export * as ConfigAgent from "./agent"`) when adding a new config module.

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package dirs like `packages/kairos`.

## Type Checking

- Always run `bun typecheck` from package directories (e.g., `packages/kairos`), never `tsc` directly.
