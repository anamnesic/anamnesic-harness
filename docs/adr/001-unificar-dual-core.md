# ADR-001: Unificar Dual Core em Único Workspace

**Data:** 2026-06-28
**Status:** Aceito

## Contexto

O monorepo Kairos tem dois "cores":

1. **`@kairos/core`** (workspace) — contém agent services (SnapshotService, AgentService, TaskService, planner, pipeline, etc.), 34 serviços exportados + 30 órfãos. NUNCA importado por nenhum consumidor runtime. É `devDependency` de `@kairos/kairoscode`.

2. **`@kairos-ai/core`** (pacote npm externo) — contém utilidades de baixo nível (logging, filesystem, flag, global, etc.). É a fundação real do runtime `@kairos/kairoscode`, que importa 24 paths diferentes deste pacote.

Além disso, `packages/core/src/index.ts` (entry point declarado no `exports` do package.json) **não existia**, tornando `@kairos/core` impossível de importar pelo entry principal.

## Decisão

Unificar os dois cores sob o workspace `@kairos/core`:

1. **Criar entry point** `packages/core/src/index.ts` que re-exporta `agent/core/index` (barrel real).
2. **Criar proxies** em `packages/core/src/{flag,util,...}/` que re-exportam `@kairos-ai/core/xxx`, permitindo que consumidores migrem de `@kairos-ai/core/xxx` para `@kairos/core/xxx` sem mudança de comportamento.
3. **Adicionar `@kairos-ai/core` como dependência** de `@kairos/core` (para os proxies funcionarem).
4. **Mover `@kairos/core` de devDependency → dependency** em `@kairos/kairoscode`.
5. **Migrar todos os imports** de `@kairos-ai/core/xxx` para `@kairos/core/xxx`.
6. **Podar** serviços órfãos/sem consumidor no `@kairos/core`.
7. **Integrar** serviços do `@kairos/core` (SnapshotService, AgentService, etc.) no runtime do `kairoscode`, substituindo implementações locais onde existirem.

## Consequências

**Positivas:**
- Fonte de verdade única para todo código compartilhado
- `@kairos/kairoscode` passa a depender do workspace, não de pacote npm externo
- Dead code órfão (~30-50 arquivos) é eliminado
- Camada de serviços pode ser gradualmente consumida pelo runtime real

**Negativas:**
- Requer mudança de imports em ~100+ arquivos no kairoscode (mecânico, baixo risco)
- Pode expor serviços quebrados ou incompletos que antes estavam "escondidos" por não serem importados
- Adiciona complexidade transitória enquanto os proxies existirem (camada extra de resolução)

**Neutras:**
- Os proxies ficarão como ponte até que o `@kairos-ai/core` externo seja completamente absorvido ou substituído

## Opções Consideradas

| Opção | Prós | Contras |
|---|---|---|
| **Unificar (escolhida)** | Single source of truth, sem duplicação | Migração de imports |
| **Manter dois cores** | Zero esforço | Duplicação permanente, dead code versionado |
| **Deletar @kairos/core** | Remove dead code | Perde serviços legados (SnapshotService, etc.) que podem ter valor |
| **Só criar entry point** | Baixo esforço | Não resolve o dual core |

## Referências

- `docs/gaps.md` — análise completa dos gaps
- `docs/integration-plan.md` — plano de integração em 6 fases
- Padrão Vercel AI SDK: core único, providers como dependências
- Padrão LangChain: `@langchain/core` é peer dependency de tudo
