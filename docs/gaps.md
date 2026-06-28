# Gaps Analysis — Kairos Monorepo

> Snapshot: before structural refactor.
> Goal: single core, no dead code, all services connected.

---

## 1. Package Dependency Graph (Actual vs Intended)

### Intended
```
@kairos/vault → @kairos/core → @kairos/kairoscode
                                    ↓
                              @kairos-ai/plugin → extensions
                                    ↓
                              @kairos/sdk (public)
```
### Actual
```
@kairos-ai/core (EXTERNAL npm) → @kairos/kairoscode (runtime real)
                                      ↓
                                @kairos-ai/plugin → extensions
                                      ↓
                                @kairos/sdk (public)

@kairos/vault → @kairos/core (workspace — devDependency only, NEVER imported)
```
**Gap:** `@kairos/core` workspace has 34 exported services + ~30 orphan files but zero runtime consumers. The real runtime uses `@kairos-ai/core` (external npm).

---

## 2. Core Entry Point Missing

| Item | Status |
|---|---|
| `packages/core/src/index.ts` | **NÃO EXISTE** (broken `exports` field) |
| `packages/core/src/agent/core/index.ts` | Real barrel (130 lines), but unreachable via `@kairos/core` main entry |
| `exports: { ".": "./src/index.ts" }` | Resolves to missing file |

---

## 3. Services Barrel vs Disk

| Metric | Count |
|---|---|
| Total `.ts` files in `services/` (excl tests, index) | 65 |
| Exported from barrel (`index.ts`) | 35 |
| **Orphans (not in barrel)** | **30** |

### 3a. Category A — Orphans WITH external consumers (need barrel export)

| File | Imported By |
|---|---|
| `AdvancedFeaturesFactory.ts` | `agent/interfaces/api/server.ts` |
| `SessionService.ts` | `agent/interfaces/api/sessionEndpoints.ts` |
| `ToolExecutionService.ts` | `agent/core/agents/tools/index.ts` |
| `WebSocketServer.ts` | `agent/interfaces/api/server.ts` |

### 3b. Category B — Orphans with intra-service deps only

| File | Imported By (within services/) |
|---|---|
| `AdvancedSecurityAnalysisService.ts` | `ProjectSecurityScanner.ts`, `AdvancedFeaturesFactory.ts` |
| `AttackSimulationFramework.ts` | `AdvancedFeaturesFactory.ts` |
| `LanceDBEmbeddings.ts` | `SessionService.ts` |
| `ModelBenchmarkService.ts` | `BenchmarkInterpretationService.ts`, `SelfOptimizationService.ts` |
| `SessionStore.ts` | `SessionService.ts` |
| `TaskExecutorService.ts` | `PipelineTaskExecutionService.ts`, `AdvancedFeaturesFactory.ts` |
| `WorkflowExecutionEngine.ts` | `AdvancedFeaturesFactory.ts` |

### 3c. Category C — Zero imports / Likely dead code (19 files)

| File | Contains |
|---|---|
| `AITaskService.ts` | `AITaskService` (barrel export commented out) |
| `APIAnalysisService.ts` | `APIAnalysisService` |
| `ComplianceAssessmentService.ts` | `ComplianceAssessmentService` |
| `ComprehensiveComplianceService.ts` | `ComprehensiveComplianceService` |
| `DangerousPatternDetectionService.ts` | `DangerousPatternDetectionService` |
| `InfrastructureAnalysisService.ts` | `InfrastructureAnalysisService` |
| `IntegrationService.ts` | `IntegrationService` (singleton) |
| `ObserverService.ts` | `ObserverService` (singleton) |
| `OpenVsxHostInstaller.ts` | `OpenVsxHostInstaller` (singleton) |
| `OpenVsxService.ts` | `OpenVsxService` (singleton) |
| `PackageVulnerabilityService.ts` | `PackageVulnerabilityService` |
| `ProjectSecurityScanner.ts` | `ProjectSecurityScanner` |
| `SecurityScanners.ts` | `ApiSecurityScanner`, `DependencySecurityScanner`, `CodeSecurityScanner` |
| `SecurityScheduleService.ts` | `SecurityScheduleService` |
| `SettingsService.ts` | `SettingsService` |
| `StreamingChatServiceNext.ts` | `StreamingChatServiceNext` |
| `SystemAnalysisService.ts` | `SystemAnalysisService` |
| `WorkflowTriggerInitializer.ts` | `WorkflowTriggerInitializer` |
| `ZeroDayDiscoveryService.ts` | `ZeroDayDiscoveryService` |

---

## 4. External `@kairos-ai/core` Imports (24 unique paths)

Used by `@kairos/kairoscode`, `packages/ui`, `packages/state`, `packages/integrations`, `packages/infra`:

```
@kairos-ai/core/cross-spawn-spawner
@kairos-ai/core/effect/logger
@kairos-ai/core/effect/memo-map
@kairos-ai/core/effect/observability
@kairos-ai/core/effect/runtime
@kairos-ai/core/filesystem
@kairos-ai/core/flag/flag
@kairos-ai/core/global
@kairos-ai/core/installation/version
@kairos-ai/core/npm
@kairos-ai/core/npm-config
@kairos-ai/core/util/binary
@kairos-ai/core/util/effect-flock
@kairos-ai/core/util/encode
@kairos-ai/core/util/error
@kairos-ai/core/util/flock
@kairos-ai/core/util/glob
@kairos-ai/core/util/hash
@kairos-ai/core/util/kairos-process
@kairos-ai/core/util/lazy
@kairos-ai/core/util/log
@kairos-ai/core/util/module
@kairos-ai/core/util/path
@kairos-ai/core/util/slug
```

**Gap:** `@kairos/core` workspace does NOT re-export any of these — each consumer imports directly from the external package. Need proxy modules under `@kairos/core/src/xxx`.

---

## 5. Exported Services With Zero Production Consumers

These are in the barrel, have tests, but NO non-test production importer:

| Service | Only imported by |
|---|---|
| `RollbackService` | Its own test |
| `ProactivePlannerService` | Its own test |
| `SelfOptimizationService` | Its own test |
| `PipelineTaskExecutionService` | Nothing |
| `ModelFallbackService` | Nothing |
| `MetricsService` | Nothing |
| `RetentionPolicyService` | Nothing |
| `DiagnosticPipelineService` | Nothing |
| `ParallelWorkflowExecutor` | Nothing |
| `WorkflowTriggerService` | Nothing |
| `StreamingChatService` | Nothing |
| `PersistentEventStore` | Nothing |
| `EventEnrichmentService` | Nothing |
| `EventEnrichmentIngestionService` | Nothing |
| `BenchmarkInterpretationService` | Nothing |
| `ChatSyncService` | Nothing |
| `OrchestratorRuntimeService` | Nothing (aside from AdaptiveOrchestratorService) |
| `ApiKeyService` | Nothing |
| `AutoSyncService` | Nothing |
| `ChatHistoryService` | Nothing |
| `ExecutionLogService` | Nothing |
| `SecurityAnalysisService` | Nothing |
| `WorkflowService` | Nothing |

---

## 6. Package Isolation (zero connectivity to core services)

These packages exist but have NO imports to any service in `@kairos/core`:

| Package | Notes |
|---|---|
| `packages/ui` | No `@kairos/core` imports |
| `packages/infra` | No `@kairos/core` imports |
| `packages/state` | No `@kairos/core` imports |
| `packages/integrations` | No `@kairos/core` imports |
| `packages/cli` | No `@kairos/core` imports |
| `packages/editor` | Build-time only |
| `packages/contract` | No `@kairos/core` imports |
| `packages/devtools` | No `@kairos/core` imports |
| `packages/registry` | No `@kairos/core` imports |
| `packages/web` | Astro docs site |

---

## 7. Services Connected (the 15% that works)

These have actual internal consumers within `packages/core/src/agent/`:

| Service | Consumers (files) |
|---|---|
| `ContextService` | 5 endpoint/utils files |
| `DecisionService` | 5 endpoint/utils files |
| `ActionLogService` | 4 tool/command files + 3 tests |
| `SnapshotService` | 3 service/tool files + 3 tests |
| `SafetyNetIntegrationService` | 3 files (AdvancedFeaturesFactory, RetentionPolicyService, servicesEndpoints) |
| `AgentService` | 2 files (OrchestratorRuntime, AITaskService) + 1 test |
| `TaskService` | 2 files (OrchestratorRuntime, AITaskService) |
| `AdaptiveOrchestratorService` | 1 file (OrchestratorRuntimeService) + 1 test |
| `ProjectService` | 1 file (projectEndpoints) |
| `UserService` | 1 file (authEndpoints) |
| `AuthService` | 1 file (authEndpoints) |
| `WorkspaceService` | 1 file (workspaceEndpoints) |
