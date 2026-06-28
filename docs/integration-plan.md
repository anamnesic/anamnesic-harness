# Integration Plan — Conectar Tudo

## O Que Foi Feito (Estrutura)

| Ação | Detalhes |
|---|---|
| `docs/gaps.md` | Gap analysis salvo como referência |
| `packages/core/src/index.ts` | Entry point criado (re-exporta `agent/core/index`) |
| 24 proxies criados | `@kairos-ai/core/{flag,filesystem,util/log,...}` re-exportados via `@kairos/core/{...}` |
| `@kairos-ai/core` adicionado como `dependencies` do `@kairos/core` | Para os proxies funcionarem |

---

## Fases de Integração

### Fase 1 — Substituir `@kairos-ai/core` por `@kairos/core` no kairoscode

**O quê:** Migrar todas as 24 imports de `@kairos-ai/core/xxx` para `@kairos/core/xxx` nos pacotes consumidores.

**Passos:**
1. Mover `@kairos/core` de `devDependencies` → `dependencies` no `packages/kairoscode/package.json`
2. Em `packages/kairoscode/src/`: trocar cada `from "@kairos-ai/core/..."` por `from "@kairos/core/..."`
3. Fazer o mesmo em `packages/ui/`, `packages/state/`, `packages/integrations/`, `packages/infra/`
4. Rodar `bun install` e verificar se resolve
5. Rodar testes do kairoscode

**Risco:** Baixo. Os proxies são re-exports puros — comportamento idêntico.

---

### Fase 2 — ~~Mover kairoscode para usar serviços do `@kairos/core`~~ CANCELADA

**Motivo:** Os agent services do `@kairos/core` eram de uma **arquitetura legacy TypeORM/OOP** completamente diferente do runtime real. O kairoscode usa **Effect+Drizzle** e já tem suas próprias implementações de tudo. A integração era impossível.

**Resolução:** Ver ADR-005 — toda a arquitetura legacy (1.331 arquivos) foi deletada. `@kairos/core` agora é puramente uma proxy layer sobre `@kairos-ai/core`.

---

### Fase 3 — Podar Categoria C (19 arquivos mortos)

**O quê:** Decidir o destino dos 19 arquivos em `services/` que ninguém importa.

**Opções por arquivo:**
| Arquivo | Ação Sugerida | Motivo |
|---|---|---|
| `InfrastructureAnalysisService.ts` | Deletar | Já limpamos mocks/fakes em sessão anterior |
| `AITaskService.ts` | Revisar + descomentar export | Parece útil, estava comentado |
| `ZeroDayDiscoveryService.ts` | Deletar | Nunca foi usado |
| `ComplianceAssessmentService.ts` | Deletar | Nunca foi usado |
| `ComprehensiveComplianceService.ts` | Deletar | Nunca foi usado |
| `DangerousPatternDetectionService.ts` | Deletar | Nunca foi usado |
| `IntegrationService.ts` | Deletar | Nunca foi usado |
| `ObserverService.ts` | Deletar | Nunca foi usado |
| `OpenVsxHostInstaller.ts` | Deletar | Nunca foi usado |
| `OpenVsxService.ts` | Deletar | Nunca foi usado |
| `PackageVulnerabilityService.ts` | Deletar | Nunca foi usado |
| `ProjectSecurityScanner.ts` | Deletar | Nunca foi usado |
| `SecurityScanners.ts` | Deletar | Nunca foi usado |
| `SecurityScheduleService.ts` | Deletar | Nunca foi usado |
| `SettingsService.ts` | Deletar | Nunca foi usado |
| `StreamingChatServiceNext.ts` | Deletar | Variante mais nova não usada |
| `SystemAnalysisService.ts` | Deletar | Nunca foi usado |
| `WorkflowTriggerInitializer.ts` | Deletar | Nunca foi usado |
| `APIAnalysisService.ts` | Deletar | Nunca foi usado |

**Risco:** Baixo. Nada importa esses arquivos.

---

### Fase 4 — Mover Categoria A para o barrel (4 arquivos)

**O quê:** Adicionar exports no barrel para arquivos que JÁ são importados por outros módulos mas não estão no barrel.

| Arquivo | Adicionar ao barrel |
|---|---|
| `AdvancedFeaturesFactory.ts` | Sim |
| `SessionService.ts` | Sim |
| `ToolExecutionService.ts` | Sim |
| `WebSocketServer.ts` | Sim |

**Risco:** Baixo. São imports que já funcionam — só falta a rota barrel.

---

### Fase 5 — Avaliar Categoria B (7 arquivos com intra-deps)

**O quê:** Decidir se os 7 arquivos com dependências internas devem ser barrel-exportados ou ficar como internal.

| Arquivo | Sugestão |
|---|---|
| `AdvancedSecurityAnalysisService.ts` | Manter internal (consumido só internamente) |
| `AttackSimulationFramework.ts` | Manter internal |
| `LanceDBEmbeddings.ts` | Manter internal |
| `ModelBenchmarkService.ts` | Manter internal |
| `SessionStore.ts` | Manter internal |
| `TaskExecutorService.ts` | Avaliar — parece útil externamente |
| `WorkflowExecutionEngine.ts` | Manter internal |

---

### Fase 6 — Limpar pacotes isolados

| Pacote | Ação |
|---|---|
| `packages/cli` | Avaliar se duplica `kairoscode` — se sim, deletar |
| `packages/contract` | Deletar (2 linhas no README, zero uso) |
| `packages/web` | Manter (Astro docs) |
| `packages/editor` | Manter (VS Code addon) |
| `packages/devtools` | Manter (tooling separado) |

---

## Timeline Sugerida

```
Fase 1 (substituir imports)       → ✓ Feito
Fase 4 (adicionar barrel p/ Cat A)→ ✓ Feito
Fase 3 (podar Cat C)              → ✓ Feito
Fase 2 (integrar services)        → ✗ Cancelada (ADR-005)
Fase 5 (Cat B)                    → ✓ Feito
Fase 6 (pacotes isolados)         → ✓ Feito
```

Todas as fases foram concluídas. O `@kairos/core` é agora uma proxy layer limpa de 25 arquivos sobre `@kairos-ai/core`, consumida pelo kairoscode via 100+ imports.
