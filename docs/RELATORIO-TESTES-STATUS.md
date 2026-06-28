# Relatório de Testes — O que Presta vs Não Presta

> Gerado em 2026-06-28 — testes executados localmente para avaliar saúde do projeto.

## Resultado Consolidado

| Pacote | Testes | Status | Problema |
|--------|--------|--------|----------|
| `packages/core/src/core/` | 19/19 ✅ | **Estável** | Nada |
| `packages/contract/` | 4/4 ✅ | **Estável** | Nada |
| `packages/core/src/agent/` | 291/419 ✅ (128 ❌) | **Instável** | Path alias `@/` não resolvido no Vitest |
| `packages/core/src/memory/` | 90/90 ✅ (5 suites ❌) | **Instável** | Import `kairos-runtime-auth.js` não encontrado |
| `packages/ui/` | 0 | **Config quebrada** | `vitest.config.ts` referencia path inexistente |
| `packages/sdk/` | 0/1 ✅ (3 suites ❌) | **Instável** | Import path resolution + `tsdown` não instalado |

---

## Detalhamento

### ✅ Estável: `packages/core/src/core/`

**19/19 testes passando** — o runtime core (que limpamos) está sólido.

```
e2e.test.ts             5/5  ✅  WebSocket, sessions, tools
sessions-e2e.test.ts    5/5  ✅  Session lifecycle, JSONL, context window
tools-e2e.test.ts       3/3  ✅  ToolRegistry, permissions
streaming-e2e.test.ts   3/3  ✅  AgentRuntime, rate limiting
cli.test.ts             3/3  ✅  CLI commands
```

### ✅ Estável: `packages/contract/`

**4/4 testes passando** — contratos de plugin.

### ⚠️ Instável: `packages/core/src/agent/`

**291 passaram, 128 falharam** em **30 suites de teste com falha**.

**Causa raiz dos 128 failures:**

| Grupo | Falhas | Causa |
|-------|--------|-------|
| `ProjectService` | 24/24 ❌ | `@/src/entities/Project` não resolvido |
| `DecisionService` | 17/17 ❌ | `@/src/entities/Decision` não resolvido |
| `SnapshotService` | 12/21 ❌ | `@/src/core/pipeline/` não resolvido + permissões FS |
| `RollbackService` | 15/17 ❌ | `@/src/core/services/SnapshotService` não resolvido |
| `ActionLogService` | 7/12 ❌ | `@/src/core/pipeline/ExecutionLog` não resolvido |
| `ContextService` | ~10 ❌ | `@/src/entities/` não resolvido |
| `EventEnrichment*` | ~8 ❌ | `@/src/observation/EventBus` não resolvido |
| `file-tools` | 1/13 ❌ | `rmSync` path issue (não cria subdir) |
| `run-command` | 1/16 ❌ | dry-run mode retorna `success: false` |
| `AdaptiveOrchestrator` | 1/3 ❌ | `@/src/core/services/` não resolvido |
| `readme-concepts` | 1/2 ❌ | Expect match fallou |

**Problema único:** O `tsconfig.json` em `packages/core/src/` mapeia `@/` → `./agent/`, mas o Vitest não tem um `resolve.alias` configurado. Basta adicionar o alias no vitest config.

### ⚠️ Instável: `packages/core/src/memory/`

**90 testes passaram**, mas **5 suites não encontraram testes** (0 test).

**Causa:** `Cannot find module './kairos-runtime-auth.js'` — import de um módulo que não existe no filesystem.

### ❌ Config Quebrada: `packages/ui/`

`vitest.config.ts` linha 6 importa `../test/vitest/vitest.shared.config.ts`, mas o path correto seria `../../devtools/src/test/vitest/vitest.shared.config.ts`.

### ❌ SDK: `packages/sdk/`

3 suites falham:
1. Import path: `../../../src/gateway/client.js` não existe
2. `tsdown: not found` — ferramenta de build não instalada

---

## Mapa de Integração — Fluxo Atual

```
                    ┌─────────────────────┐
                    │    packages/vault/   │  REAL
                    │  AES-256-GCM crypto  │
                    └────────┬────────────┘
                             │ usado por
                             ▼
┌──────────────────────────────────────────────────────┐
│               packages/core/src/core/                │  ✅ 19/19
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │
│  │ConfigMgr│ │AgentRunTm│ │ToolReg │ │SessionMgr │  │
│  └─────────┘ └──────────┘ └────────┘ └───────────┘  │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │
│  │PermMgr  │ │MsgGateway│ │WebSock │ │PluginReg  │  │
│  └─────────┘ └──────────┘ └────────┘ └───────────┘  │
└──────────────────────┬───────────────────────────────┘
                       │ ✖ sem integração direta
                       ▼
┌──────────────────────────────────────────────────────┐
│           packages/core/src/agent/ (serviços)        │  ⚠️ 291/419
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │AgentSvc  │ │Proactive │ │Orchestrtr │ │Project │ │
│  │  378 lin │ │  368 lin │ │  484 lin  │ │  Svc   │ │
│  └──────────┘ └──────────┘ └───────────┘ └────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │Decision  │ │Snapshot  │ │Rollback   │ │+40 svc │ │
│  └──────────┘ └──────────┘ └───────────┘ └────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  ✖ Usam @/ path alias quebrado no Vitest        │ │
│  │  ✖ Dependem de TypeORM (DataSource) p/ persistir│ │
│  │  ✖ Importam EventBus, Entities, Pipeline        │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────┘
                       │ ✖ sem integração
                       ▼
┌──────────────────────────────────────────────────────┐
│              Frontends (NÃO INTEGRADOS)               │
│  ┌────────────────┐  ┌──────────────────────────┐    │
│  │ packages/state │  │   packages/kairoscode    │    │
│  │   React 19     │  │   SolidJS + OpenTUI      │    │
│  │   85 hooks     │  │   Runtime + TUI + Server │    │
│  │   146 comps    │  │   23 CLI commands        │    │
│  └────────────────┘  └──────────────────────────┘    │
│  ┌────────────────┐  ┌──────────────────────────┐    │
│  │  packages/ui   │  │    app/ (Next.js)        │    │
│  │  SolidJS +     │  │    Landing + Dashboard   │    │
│  │  60+ comps     │  │    API routes           │    │
│  └────────────────┘  └──────────────────────────┘    │
│                                                      │
│  ✖ NENHUM frontend consome os serviços do backend   │
│  ✖ Dados mockados (providers simulados, services    │
│    não conectados à UI)                             │
└──────────────────────────────────────────────────────┘
```

---

## O que Precisa de Integração

```
Backend Real (pronto)           → Frontend (não conectado)
────────────────────────────────────────────────────
AgentService (CRUD agentes)     → UI de gerenciamento de agentes
SessionManager (sessões)        → Lista de sessões, histórico
ProactivePlanner (planos)       → Dashboard de planos/sugestões
DecisionService (decisões)      → UI de decisões
ToolRegistry (ferramentas)      → Catálogo de ferramentas
ProviderRegistry (providers)    → Seletor de modelo/provedor
SnapshotService (snapshots)     → Timeline de snapshots
RollbackService (rollback)      → Botão de rollback
WebSocketAPI (tempo real)       → Streaming de respostas
MessageGateway (canais)         → Configuração de canais
Permissions (permissões)        → UI de controle de acesso
```

## Barreiras para Integração

1. **Path alias `@/`** — Services usam `@/src/...` que não resolve no Vitest (só no runtime)
2. **TypeORM pendente** — Services precisam de DataSource (SQLite) configurado
3. **Stubs nos providers** — `callLLM()` no AgentRuntime retorna mock
4. **UI não conectada** — Frontends ricos mas isolados do backend
5. **Config de teste fragmentada** — 5 abordagens diferentes (Vitest v1, v4, Bun test, devtools configs)
