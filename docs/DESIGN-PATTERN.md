# Design Pattern Recomendado — Kairos

> Análise baseada na estrutura atual do repositório `chronokairo/kairos`.

---

## 1. O que o projeto é

**Kairos** é um agente de IA persistente e proativo com memória contínua, capaz de operar em múltiplas superfícies:

| Superfície       | Tecnologia atual             |
|------------------|------------------------------|
| Web app          | Next.js (`app/`)             |
| Desktop          | Tauri (`src-tauri/`) + Electron (`packages/desktop-electron/`) |
| CLI              | Commander (`src/interfaces/cli/`) |
| VS Code          | Extension (`sdks/vscode/`, `src/interfaces/dashboard/`) |
| API/MCP          | Hono + Express (`src/interfaces/api/`) |
| Mobile           | Android/iOS nativos (`apps/android/`, `apps/ios/`) |
| macOS            | Swift/MLX (`apps/macos/`, `apps/macos-mlx-tts/`) |

**Núcleo do agente** (`src/`):

```
memory  →  observation  →  recall  →  pipeline  →  actions
                                           ↑
                                        sleep (consolidação)
```

---

## 2. Histórico: estrutura híbrida consolidada

O repositório tinha um estado de transição não finalizada (70+ pacotes desorganizados em `packages/` com lockfiles duplicados, arquivos temporários e dois pnpm-workspace.yaml conflitantes). Esse problema foi resolvido na reorganização descrita neste documento.

---

## 3. Design Pattern recomendado: Turborepo Monorepo Unificado

### 3.1 Estrutura implementada

```
kairos/
│
├── apps/                          # Superfícies deployáveis (não importáveis)
│   ├── android/                   # Android nativo
│   ├── ios/                       # iOS nativo
│   ├── macos/                     # macOS nativo
│   └── macos-mlx-tts/             # macOS com MLX TTS
│
├── packages/              # Todos os pacotes com escopo @kairos/*
│   ├── core/           @kairos/core          # Runtime do agente de IA
│   ├── ui/             @kairos/ui            # Interfaces de usuário (apps e componentes)
│   ├── cli/            @kairos/cli           # CLI, terminal e TUI
│   ├── editor/         @kairos/editor        # Keybindings, Vim, bridge, native
│   ├── plugins/        @kairos/plugins       # Plugin system, SDK, OpenAPI
│   ├── integrations/   @kairos/integrations  # Slack, skills, voice, Swabble
│   ├── infra/          @kairos/infra         # Protocol, types, constants, proxy
│   ├── state/          @kairos/state         # UI state, context, hooks, components
│   ├── devtools/       @kairos/devtools      # Scripts, containers, QA, tsconfigs
│   └── opencode/       @kairos/opencode      # Integração opencode
│
├── src/                           # Núcleo legado (em migração para @kairos/core)
├── app/                           # Next.js app legado (em migração para @kairos/ui)
├── src-tauri/                     # Desktop Tauri (em migração para @kairos/ui/src/desktop)
├── sdks/vscode/                   # VS Code extension
│
├── infra/                         # Infraestrutura SST/Cloudflare (app, console, enterprise)
├── docs/                          # Documentação centralizada (DESIGN-PATTERN, PACKAGES, i18n)
├── data/                          # Persistência em runtime (gitignored)
├── extensions/                    # Extensões de editores terceiros
│
├── package.json                   # Root: apenas scripts de orquestração
├── pnpm-workspace.yaml            # packages: ["packages/*", "apps/*"]
├── turbo.json                     # Pipeline de build
└── tsconfig.json                  # Base tsconfig com references
```

> Para descrição detalhada de cada subdiretório de `packages/*`, ver [`PACKAGES.md`](./PACKAGES.md).

---

## 4. Regras de fronteira (o que vai onde)

| Critério                                      | `apps/`          | `packages/`        |
|-----------------------------------------------|------------------|--------------------|
| Pode ser importado por outro pacote?          | ❌ Não           | ✅ Sim             |
| É uma superfície de usuário final?            | ✅ Sim           | ❌ Não             |
| Tem seu próprio processo de deploy?           | ✅ Sim           | ❌ Não             |
| Expõe tipos e funções para reutilização?      | ❌ Não           | ✅ Sim             |
| Depende de UI framework específico da plataforma? | ✅ Geralmente  | ❌ Evitar          |

---

## 5. Camadas internas do `@kairos/core`

O motor do agente segue um padrão de **pipeline orientado a eventos** com camadas bem definidas:

```
┌─────────────────────────────────────────────────────────────────┐
│              Interfaces (@kairos/ui, @kairos/cli, apps/)         │
│        Web    Desktop    CLI    VS Code    API    Mobile          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ usa
┌───────────────────────────▼─────────────────────────────────────┐
│                      @kairos/core                                │
│                                                                  │
│  ┌────────────────┐  ┌─────────────┐   ┌──────────────────────┐ │
│  │  core/         │  │  memdir/    │   │  services/           │ │
│  │  (pipeline,    │  │  memory/    │   │  (analytics, API,    │ │
│  │   agendamento) │  │  (vetores)  │   │   autoDream)         │ │
│  └───────┬────────┘  └──────┬──────┘   └──────────┬───────────┘ │
│          │                  │                      │             │
│          └──────────────────▼──────────────────────▼             │
│                        ┌──────────┐                              │
│                        │  query/  │  (tokenBudget, stopHooks)   │
│                        └────┬─────┘                              │
│                             │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │      tools/        │  (BashTool, AgentTool) │
│                    └─────────┬──────────┘                        │
│                              │                                   │
│                    ┌──────────▼──────────┐                       │
│                    │      tasks/         │  (execução de tasks)  │
│                    └─────────────────────┘                       │
│                                                                  │
│   coordinator/ (multi-agente) · migrations/ · assistant/         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Configurações raiz recomendadas

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### `turbo.json` (simplificado)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

### `package.json` raiz (apenas orquestração)
```json
{
  "name": "kairos",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

---

## 7. Plano de migração (fases)

### Fase 1 — Limpeza (sem quebrar nada)
- [ ] Limpar `packages/` removendo arquivos soltos e temporários
- [ ] Unificar os dois `pnpm-lock.yaml` (root e `packages/`)
- [ ] Remover o `pnpm-workspace.yaml` interno de `packages/` (deixar só no root)
- [ ] Corrigir `pnpm-workspace.yaml` raiz para incluir `apps/*` e `packages/*`

### Fase 2 — Extrair o core
- [ ] Mover `src/core/`, `src/memory/`, `src/observation/`, `src/sleep/`, `src/actions/`, `src/policies/`, `src/recall/` → `packages/core/src/`
- [ ] Mover `src/utils/` → `packages/core/src/utils/`
- [ ] Atualizar imports de todos os apps que dependem desse core

### Fase 3 — Separar os apps
- [ ] Mover `app/` → `apps/web/` (Next.js)
- [ ] Mover `src-tauri/` → `apps/desktop/`
- [ ] Mover `src/interfaces/cli/` → `apps/cli/`
- [ ] Mover `sdks/vscode/` + `src/interfaces/dashboard/` → `apps/vscode/`
- [ ] Mover `src/interfaces/api/` → `apps/api/`

### Fase 4 — Consolidar tipos e UI
- [ ] Extrair tipos compartilhados para `packages/protocol/`
- [ ] Mover componentes React reutilizáveis para `packages/ui/`

---

## 8. O que NÃO fazer

| ❌ Anti-pattern                          | ✅ Alternativa                               |
|------------------------------------------|----------------------------------------------|
| `package.json` raiz com metadata de VS Code extension | Metadata de extensão fica em `apps/vscode/package.json` |
| Dois `pnpm-lock.yaml` no mesmo repo     | Um único lockfile na raiz                    |
| `packages/` com arquivos `.py`, `.html` temporários | Apenas pacotes com `package.json` em `packages/` |
| `src/` misturando core + screens + routes | Core em `packages/core/`, telas no app correto |
| Importar de `../../packages/foo` com path relativo | Usar nome do pacote: `@kairos/foo`            |
| Scripts de build duplicados em raiz e em `packages/` | Scripts apenas na raiz via Turborepo          |

---

## 9. Referências internas

- [`docs/MONOREPO-DESIGN-PATTERN-REPORT.md`](./MONOREPO-DESIGN-PATTERN-REPORT.md) — análise anterior do estado híbrido
- [`docs/PACKAGES-UNIFICATION-ANALYSIS.md`](./PACKAGES-UNIFICATION-ANALYSIS.md) — análise de unificação de pacotes
- [`docs/MONOREPO-TO-SINGLE-PROJECT-MIGRATION.md`](./MONOREPO-TO-SINGLE-PROJECT-MIGRATION.md) — guia de migração alternativo
- [`turbo.json`](../turbo.json) — configuração atual do Turborepo
- [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) — workspace atual
