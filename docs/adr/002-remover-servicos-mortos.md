# ADR-002: Remover Serviços Mortos (Category C)

**Data:** 2026-06-28
**Status:** Aceito

## Contexto

O diretório `packages/core/src/agent/core/services/` contém 19 arquivos que:
- Não são exportados pelo barrel (`services/index.ts`)
- Não são importados por nenhum outro arquivo no repositório
- Não têm testes correspondentes
- Representam código morto versionado — nunca usado desde que foi criado

## Decisão

**Deletar 18 arquivos** e **reabilitar 1** (`AITaskService`).

### Deletados (zero referências em runtime)

| Arquivo | Motivo |
|---|---|
| `APIAnalysisService.ts` | Nunca importado |
| `ComplianceAssessmentService.ts` | Nunca importado |
| `ComprehensiveComplianceService.ts` | Nunca importado |
| `DangerousPatternDetectionService.ts` | Nunca importado |
| `InfrastructureAnalysisService.ts` | Nunca importado (já limpo de mocks em sessão anterior) |
| `IntegrationService.ts` | Nunca importado |
| `ObserverService.ts` | Nunca importado |
| `OpenVsxHostInstaller.ts` | Nunca importado |
| `OpenVsxService.ts` | Nunca importado |
| `PackageVulnerabilityService.ts` | Nunca importado |
| `ProjectSecurityScanner.ts` | Nunca importado |
| `SecurityScanners.ts` | Nunca importado |
| `SecurityScheduleService.ts` | Nunca importado |
| `SettingsService.ts` | Nunca importado |
| `StreamingChatServiceNext.ts` | Nunca importado (variante mais nova não usada) |
| `SystemAnalysisService.ts` | Nunca importado |
| `WorkflowTriggerInitializer.ts` | Nunca importado |
| `ZeroDayDiscoveryService.ts` | Nunca importado |

### Reabilitado

`AITaskService.ts` — export do barrel descomentado. O serviço importa `AgentService` e `TaskService` (que são ativos) e parece ter valor. Fica disponível para integração futura.

## Consequências

**Positivas:**
- Reduz 65 → 47 arquivos no diretório de serviços
- Elimina código morto que poluía navegação e audits
- Remove falsa impressão de que "muitos serviços existem"

**Negativas:**
- Se algum desses serviços for necessário no futuro, precisará ser reimplementado

## Verificação

Cada arquivo foi verificado com `grep -rl` cruzando nome da classe em todo o repo. Zero imports encontrados.
