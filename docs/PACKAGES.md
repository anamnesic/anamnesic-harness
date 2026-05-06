# `packages/*` — Guia de Pacotes

> Todos os pacotes do projeto seguem o escopo `@kairos/*`.
> Para o racional arquitetural completo, ver [`DESIGN-PATTERN.md`](./DESIGN-PATTERN.md).

---

## Estrutura de diretórios

```
packages/
├── core/           # @kairos/core  — Runtime do agente de IA
├── ui/             # @kairos/ui    — Interfaces de usuário (apps e componentes)
├── cli/            # @kairos/cli   — CLI, terminal e TUI
├── editor/         # @kairos/editor — Keybindings, Vim, bridge, native
├── plugins/        # @kairos/plugins — Plugin system, SDK, OpenAPI
├── integrations/   # @kairos/integrations — Slack, skills, voice, Swabble
├── infra/          # @kairos/infra — Protocol, types, constants, proxy
├── state/          # @kairos/state — UI state, context, hooks, components
├── devtools/       # @kairos/devtools — Scripts, containers, QA, tsconfigs
└── opencode/       # @kairos/opencode — Integração opencode
```

---

## `@kairos/core` — Runtime do Agente

**Pacote:** `packages/core/`
**Papel na arquitetura:** Camada de negócio central. Nenhuma UI ou interface específica de plataforma aqui. Ver [DESIGN-PATTERN.md §5](./DESIGN-PATTERN.md#5-camadas-internas-do-packagescore).

```
src/
├── core/          # Motor principal: runtime, pipeline multi-agente, agendamento
├── memdir/        # Memória baseada em sistema de arquivos (scan, age, paths)
├── memory/        # SDK de engines de memória (embeddings, storage, QMD, foundation)
├── services/      # Serviços auxiliares: analytics, autoDream, API, summaries
├── tasks/         # Tipos de task: DreamTask, LocalAgentTask, LocalShellTask
├── tools/         # Ferramentas executáveis: BashTool, AgentTool, ConfigTool, BriefTool
├── query/         # Configuração de queries LLM: tokenBudget, stopHooks, deps
├── migrations/    # Migrações de dados e settings do usuário entre versões
├── coordinator/   # Modo coordenador para orquestração de múltiplos agentes
├── assistant/     # Histórico de sessão do assistente
└── utils/         # Utilitários transversais do core
```

---

## `@kairos/ui` — Interfaces de Usuário

**Pacote:** `packages/ui/`
**Papel na arquitetura:** Todas as superfícies visuais. Cada subdiretório é um app ou biblioteca de UI. Ver [DESIGN-PATTERN.md §3](./DESIGN-PATTERN.md#31-estrutura-alvo).

```
src/
├── app/                # App principal React/web do Kairos
├── desktop/            # App desktop com Tauri bindings (entry, i18n, bindings)
├── desktop-electron/   # Shell Electron (main, preload, renderer)
├── enterprise/         # Versão enterprise da aplicação
├── web/                # Site de marketing e docs (assets, components, content, i18n)
├── components-ui/      # Biblioteca de componentes UI compartilhados
├── storybook/          # Catálogo de componentes Storybook
├── console/            # Console web de administração (app, mail, resources)
├── identity/           # Assets de marca: mark.svg, ícones PNG em múltiplos tamanhos
└── apps-src/           # Código-fonte do agregador de apps do monorepo
```

---

## `@kairos/cli` — CLI / Terminal

**Pacote:** `packages/cli/`
**Papel na arquitetura:** Tudo relacionado à interface de linha de comando e terminal. Ver [DESIGN-PATTERN.md §3](./DESIGN-PATTERN.md#31-estrutura-alvo).

```
src/
├── cli/          # Utilitários de I/O (handlers, print, structuredIO, remoteIO)
├── commands/     # Comandos do CLI: add-dir, advisor, autofix-pr, backfill-sessions, agents…
├── entrypoints/  # Pontos de entrada: CLI (cli.tsx), MCP (mcp.ts), SDK, sandbox
├── ink/          # Componentes React para terminal via Ink (Ansi, colorize, components)
├── tui/          # Interface TUI em Go (cmd/, internal/, kairos/)
└── screens/      # Telas do CLI: Doctor, REPL, ResumeConversation
```

---

## `@kairos/editor` — Editor / IDE

**Pacote:** `packages/editor/`
**Papel na arquitetura:** Integrações e funcionalidades específicas de editors. Nenhuma lógica de agente aqui.

```
src/
├── keybindings/  # Sistema de keybindings customizáveis (defaultBindings, parser, context)
├── vim/          # Modo Vim completo (motions, operators, textObjects, transitions)
├── bridge/       # Bridge de IPC entre processos (bridgeApi, bridgeMessaging, bridgeMain)
├── native/       # Bindings nativos TypeScript: color-diff, file-index, yoga-layout
└── extensions/   # Suporte para extensões de editors terceiros (Zed, etc.)
```

---

## `@kairos/plugins` — SDK e Plugins

**Pacote:** `packages/plugins/`
**Papel na arquitetura:** Tudo que permite extensibilidade do Kairos por desenvolvedores externos. Ver [DESIGN-PATTERN.md §4](./DESIGN-PATTERN.md#4-regras-de-fronteira-o-que-vai-onde).

```
src/
├── plugin/     # Sistema de plugins do Kairos (example, shell, tool, index)
├── sdk/        # SDK público para desenvolvedores de plugins (browser-config, plugin-entry, runtime, auth)
├── contract/   # Contrato de interface de pacote de plugin (garante compatibilidade)
├── openapi/    # SDK JavaScript público + especificação OpenAPI
├── sdk-v2/     # Versão alternativa do SDK (a unificar com sdk/)
└── registry/   # Agregador/registro de plugins disponíveis
```

---

## `@kairos/integrations` — Integrações Externas

**Pacote:** `packages/integrations/`
**Papel na arquitetura:** Conectores para serviços e plataformas de terceiros.

```
src/
├── skills/    # Integrações via skills: 1Password, Apple Notes, Bear, Apple Reminders, Blogwatcher…
├── slack/     # Integração dedicada com Slack
├── function/  # Funções edge/serverless para Cloudflare Workers
├── voice/     # Modo de interação por voz
└── swabble/   # Daemon de wake-word via Speech.framework (macOS 26, Swift 6.2, on-device)
```

---

## `@kairos/infra` — Infraestrutura Interna

**Pacote:** `packages/infra/`
**Papel na arquitetura:** Contratos e plumbing compartilhados. Não pode depender de UI ou agente. Ver [DESIGN-PATTERN.md §4](./DESIGN-PATTERN.md#4-regras-de-fronteira-o-que-vai-onde).

```
src/
├── protocol/  # Tipos e interfaces compartilhados entre todos os pacotes
├── types/     # Tipos TypeScript adicionais: command, hooks, ids, logs, permissions
├── constants/ # Constantes globais: apiLimits, betas, errorIds, figures
├── schemas/   # Schemas de validação de hooks
├── proxy/     # Proxy upstream para requisições (relay, upstreamproxy)
├── server/    # Servidor de conexão direta (createDirectConnectSession, manager)
└── remote/    # Gerenciamento de sessões remotas via WebSocket
```

---

## `@kairos/state` — UI State & Internals

**Pacote:** `packages/state/`
**Papel na arquitetura:** Estado global, contextos React e componentes internos da aplicação. Depende de `@kairos/infra` mas não de `@kairos/core`.

```
src/
├── store/         # Estado global: AppStateStore, AppState, selectors, onChangeAppState
├── context/       # Contextos React: fpsMetrics, mailbox, modalContext, notifications, overlayContext
├── hooks/         # React hooks: fileSuggestions, toolPermission, unifiedSuggestions, notifs
├── components/    # Componentes React da aplicação (AgentProgressLine, AutoUpdater, etc.)
├── bootstrap/     # Estado de inicialização da aplicação
├── output-styles/ # Carregamento de estilos de formatação de saída
├── moreright/     # Painel lateral expandido do editor
└── buddy/         # Mascote/companion animado (sprites, CompanionSprite, useBuddyNotification)
```

---

## `@kairos/devtools` — Dev / Build / QA

**Pacote:** `packages/devtools/`
**Papel na arquitetura:** Tooling de desenvolvimento. Não faz parte do produto em produção.

```
src/
├── scripts/        # Scripts de build, automação e deploy do monorepo (296+ arquivos)
├── script/         # Utilitários de scripting reutilizáveis
├── containers/     # Dockerfiles: base, bun-node, rust, publish, script, sandbox
├── vendor/         # Dependências vendorizadas (ex: a2ui)
├── patches/        # Patches de dependências npm (pnpm patch)
├── qa/             # Cenários e harness de QA (frontier-harness, scenarios)
├── security/       # Ferramentas de análise de segurança (opengrep)
├── test/           # Testes de integração e arquitetura (e2e, boundary, appcast)
├── fixtures/       # Fixtures reutilizáveis para testes
├── tsconfigs/      # Configurações TypeScript do monorepo (projetos, extensões, plugins, ui)
├── github-desktop/ # Dependências de build do GitHub Desktop
└── legacy-*/       # Configs herdados do inner monorepo (referência)
```

---

## `@kairos/opencode` — Opencode Integration

**Pacote:** `packages/opencode/`
**Papel na arquitetura:** Integração do opencode como sub-produto independente dentro do ecossistema Kairos.

```
src/
├── opencode/   # Pacote opencode completo: agents, ACP, auth, account, audio
└── internals/  # Código-fonte interno: ACP, bindings, canvas-host, channels, chat, agents
```

---

## Dependências entre pacotes

```
@kairos/integrations ──┐
@kairos/cli ───────────┤
@kairos/ui ────────────┤
@kairos/editor ────────┼──→ @kairos/core ──→ @kairos/infra
@kairos/plugins ───────┤          ↑
@kairos/state ─────────┤     @kairos/infra
@kairos/opencode ──────┘

@kairos/devtools  (sem dependência de runtime nos outros pacotes)
```

> **Regra:** imports devem sempre apontar para `@kairos/<pkg>` — nunca usar caminhos relativos entre pacotes (`../../`).

---

## Referência rápida

| Quero… | Pacote |
|--------|--------|
| Modificar o pipeline do agente | `@kairos/core/src/core/` |
| Adicionar uma ferramenta ao agente | `@kairos/core/src/tools/` |
| Criar um componente visual | `@kairos/state/src/components/` |
| Adicionar um comando CLI | `@kairos/cli/src/commands/` |
| Criar uma integração externa | `@kairos/integrations/src/skills/` |
| Desenvolver um plugin | `@kairos/plugins/src/sdk/` |
| Definir um tipo compartilhado | `@kairos/infra/src/types/` |
| Adicionar um script de build | `@kairos/devtools/src/scripts/` |

---

*Ver também: [`DESIGN-PATTERN.md`](./DESIGN-PATTERN.md) · [`DESIGN-PATTERN.md §7 — Plano de migração`](./DESIGN-PATTERN.md#7-plano-de-migração-fases)*
