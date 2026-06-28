# ADR-005: Deletar Arquitetura Legacy TypeORM do @kairos/core

**Data:** 2026-06-28
**Status:** Aceito

## Contexto

Após a migração de imports (ADR-001) e remoção de Category C (ADR-002/003), iniciamos a Fase 2 do integration-plan: integrar os agent services no pipeline real do kairoscode.

A descoberta foi que **a integração é impossível** — os serviços são de uma arquitetura completamente diferente que já foi substituída.

### Descoberta Arquitetural

| Aspecto | `@kairos/core` (workspace) | `@kairos/kairoscode` (runtime real) |
|---|---|---|
| ORM | **TypeORM** (25 imports) | **Drizzle ORM** (61 imports) |
| Paradigma | OOP classe-based | Effect functional (`Context.Service`, `Layer`) |
| DB schema | TypeORM entities (`@Entity()`) | Drizzle `*.sql.ts` (`sqliteTable()`) |
| Agent system | `AgentService` com pre-built agents | Effect `@kairos/Agent` + Vercel AI SDK |
| Event bus | Custom `EventBus` | Effect services |
| Service pattern | `export class FooService { }` | `export class Service extends Context.Service<Service, Interface>()(...)` |

### Escala do Código Morto

`packages/core/src/` continha **1.356 arquivos .ts**, dos quais apenas **24** (os proxies criados no ADR-001) tinham consumidores. Os outros **1.331 arquivos (98.2%)** eram da arquitetura legacy:

| Diretório | Arquivos | Conteúdo |
|---|---|---|
| `utils/` | 549 | Utilities legacy (auth, git, mcp, shell, telemetry, etc.) |
| `agent/` | 284 | Services TypeORM (AgentService, TaskService, SnapshotService, etc.) + entities + policies |
| `tools/` | 151 | Ferramentas legacy |
| `services/` | 129 | Serviços legacy (analytics, compact, mcp, oauth, etc.) |
| `core/` | 99 | Package `kairos-core` aninhado com package.json próprio |
| `memory/` | 92 | Package `@kairos/memory-host-sdk` aninhado (duplicado por kairoscode) |
| `tasks/` | 10 | Tasks legacy |
| `memdir/` | 8 | Memory directory legacy |
| `query/` | 6 | Query pipeline legacy |
| `assistant/` | 2 | Assistant legacy |
| `coordinator/` | 1 | Coordinator legacy |

### Verificação de Zero Consumidores

```bash
# Zero imports de @kairos/core/agent em todo o repo
grep -r "from '@kairos/core/agent" packages/ → No files found

# Zero imports de qualquer diretório legacy
grep -r "from '@kairos/core/(assistant|coordinator|core|memdir|memory|query|services|tasks|tools|utils)" packages/ → No files found

# Zero imports do entry point raiz
grep -r "from '@kairos/core'" packages/ → No files found
```

O kairoscode tem suas PRÓPRIAS implementações de tudo que existia no legacy:
- `src/agent/agent.ts` — Effect-based, substitui `AgentService`
- `src/session/session.ts` — Drizzle-based, substitui `SessionService`
- `src/internals/memory-host-sdk/` — cópia própria do memory-host-sdk
- `src/storage/*.sql.ts` — Drizzle schemas, substituem TypeORM entities

## Decisão

**Deletar todos os 1.331 arquivos legacy**, mantendo apenas:
- 9 diretórios de proxy (`flag/`, `util/`, `global/`, `filesystem/`, `installation/`, `npm/`, `npm-config/`, `effect/`, `cross-spawn-spawner/`)
- Entry point `index.ts` atualizado para exportar `Global`

### Mudanças Executadas

1. **Deletados:** `agent/`, `assistant/`, `coordinator/`, `core/`, `memdir/`, `memory/`, `query/`, `services/`, `tasks/`, `tools/`, `utils/`, `BRAIN_DOCUMENTATION.md`, `node_modules/`
2. **Entry point** `src/index.ts` mudou de `export * from "./agent/core/index"` → `export { Global } from "./global"`
3. **`@kairos/vault` removido** das dependencies de `@kairos/core` (só era usado por SelfOptimizationService e ProactivePlannerService, ambos deletados)
4. **`bun install` executado** — lockfile atualizado

### Estrutura Final

```
packages/core/src/
├── cross-spawn-spawner/index.ts
├── effect/
│   ├── logger/index.ts
│   ├── memo-map/index.ts
│   ├── observability/index.ts
│   └── runtime/index.ts
├── filesystem/index.ts
├── flag/flag/index.ts
├── global/index.ts
├── index.ts
├── installation/version/index.ts
├── npm/index.ts
├── npm-config/index.ts
└── util/
    ├── binary/index.ts
    ├── effect-flock/index.ts
    ├── encode/index.ts
    ├── error/index.ts
    ├── flock/index.ts
    ├── glob/index.ts
    ├── hash/index.ts
    ├── kairos-process/index.ts
    ├── lazy/index.ts
    ├── log/index.ts
    ├── module/index.ts
    ├── path/index.ts
    └── slug/index.ts
```

**25 arquivos .ts total** (era 1.356).

## Consequências

**Positivas:**
- Redução de 98.2% no tamanho do pacote (1.356 → 25 arquivos)
- Elimina definitive da confusão "dual architecture" — TypeORM nunca, Effect sempre
- `@kairos/core` fica com responsabilidade clara: proxy layer sobre `@kairos-ai/core`
- Build/typecheck mais rápido (menos arquivos para processar)
- Busca e navegação no repo drasticamente mais limpas
- `@kairos/vault` dependency removida (não mais arrastada sem necessidade)

**Negativas:**
- Se algum dia for preciso referência de como o legacy funcionava, precisa consultar git history
- Algoritmos específicos (ranking, recall, sleep inference) podem ter valor de referência

**Neutras:**
- A Fase 2 do integration-plan original ("integrar agent services") fica **obsoleta** — não há serviços para integrar, o kairoscode já tem suas próprias implementações Effect+Drizzle

## Opções Consideradas

| Opção | Prós | Contras |
|---|---|---|
| **Deletar tudo (escolhida)** | Repo limpo, sem confusão, sem maintenance | Perde referência legacy (recuperável via git) |
| Arquivar em branch/tag | Referência preservada | Branch esquecida, mesma confusão |
| Manter e documentar | Zero esforço | 1.331 arquivos mortos versionados, typecheck lento, busca poluída |
| Rewriting em Effect | Preserva funcionalidade | Esforço enorme, kairoscode já tem implementações próprias |

## Impacto no Integration Plan

A Fase 2 do `docs/integration-plan.md` ("Integrar agent services no pipeline do kairoscode") é **cancelada**. As fases revisadas são:

1. ~~Fase 1: Diagnóstico~~ ✓
2. ~~Fase 2: Integrar agent services~~ **Cancelada** — arquitetura incompatível
3. ~~Fase 3: Remover Category C~~ ✓
4. ~~Fase 4: Migrar imports~~ ✓
5. ~~Fase 5: Category B~~ ✓
6. ~~Fase 6: Pacotes isolados~~ ✓
7. **Nova Fase 7: Deletar arquitetura legacy** ✓ (este ADR)

O `@kairos/core` agora é puramente uma **proxy layer** sobre `@kairos-ai/core`, consumida pelo kairoscode via 100+ imports.

## Referências

- ADR-001 — Unificar dual core (criou os proxies)
- ADR-002 — Remover Category C (18 serviços mortos)
- ADR-003 — Category B + pacotes isolados
- ADR-004 — Workspace resolution (issue pre-existing)
- `docs/gaps.md` — análise original dos 65 serviços
- `docs/integration-plan.md` — plano em 6 fases (Fase 2 cancelada por este ADR)
