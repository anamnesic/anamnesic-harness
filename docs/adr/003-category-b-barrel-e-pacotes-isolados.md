# ADR-003: Category B — Intra-Deps e Pacotes Isolados

**Data:** 2026-06-28
**Status:** Aceito

## Contexto

Após remover Category C (18 arquivos mortos), restam:

### Category B (7 arquivos com dependências internas)
Não estão no barrel mas são importados por outros serviços.

### Pacotes Isolados (Phase 6)
`packages/cli` e `packages/contract` — zero dependentes no monorepo.

## Decisão

### Category B

| Arquivo | Importado por | Decisão | Motivo |
|---|---|---|---|
| `AdvancedSecurityAnalysisService.ts` | AdvancedFeaturesFactory | Manter internal | Só usado internamente, 614 linhas de segurança |
| `AttackSimulationFramework.ts` | AdvancedFeaturesFactory | Manter internal | Só usado internamente, 689 linhas |
| `LanceDBEmbeddings.ts` | SessionService | Manter internal | Data-layer helper, só SessionService usa |
| `ModelBenchmarkService.ts` | BenchmarkInterpretationService, SelfOptimizationService | Manter internal | Só usado internamente |
| `SessionStore.ts` | SessionService | Manter internal | Data-layer helper, só SessionService usa |
| `TaskExecutorService.ts` | PipelineTaskExecutionService, AdvancedFeaturesFactory | **Adicionar ao barrel** | Serviço relevante (sandbox), AdvancedFeaturesFactory já é barrel-exportado |
| `WorkflowExecutionEngine.ts` | AdvancedFeaturesFactory | Manter internal | Só usado internamente |

### Pacotes Isolados

| Pacote | Decisão | Motivo |
|---|---|---|
| `packages/cli` (`@kairos/cli`) | **Deletar** | Zero dependentes. CLI/TUI duplicado pelo kairoscode. |
| `packages/contract` (`@kairos/plugin-package-contract`) | **Deletar** | Zero dependentes. v0.0.0-private, nunca publicado. |

## Consequências

**Positivas:**
- Barrel mais limpo (serviços realmente públicos vs internos)
- Elimina 2 pacotes que ninguém usa
- TaskExecutorService fica acessível para consumo externo

**Negativas:**
- Nenhuma (código não utilizado não gera impacto)
