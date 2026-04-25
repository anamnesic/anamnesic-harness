# Frontend Gaps — Funcionalidades Não Implementadas

> Estado em: Abril 2026  
> Escopo: tudo que existe no backend (rotas, serviços) mas não tem tela ou fluxo funcional no frontend.

---

## 1. Telas Completamente Ausentes

### 1.1 Workspaces

**Rotas disponíveis:**
- `GET  /api/v1/workspaces` — lista todos os workspaces
- `POST /api/v1/workspaces` — cria novo workspace
- `GET  /api/v1/workspaces/:workspaceId` — detalhe (ainda com `requireAuth` — remover antes de usar)

**O que falta:**
- Tela `src/screens/Workspaces.tsx` com listagem, cartão por workspace (nome, slug, owner, data)
- Formulário de criação (nome, descrição, slug)
- Rota `PUT /api/v1/workspaces/:id` e `DELETE /api/v1/workspaces/:id` não existem — precisam ser criadas
- Remoção do `requireAuth` do `GET /api/v1/workspaces/[workspaceId]/route.ts`

---

### 1.2 Projects

**Rotas disponíveis:**
- `GET /api/v1/projects` — lista todos os projetos

**O que falta:**
- Tela `src/screens/Projects.tsx` com listagem, filtro por workspace
- Formulário de criação — **não existe rota `POST /api/v1/projects`** (o serviço `ProjectService.create()` existe, só falta a rota)
- Rotas de edição e deleção (`PUT`, `DELETE`) também ausentes
- `ProjectService.get(id)`, `update()`, `delete()` — todos prontos no backend, zero UI

---

### 1.3 Plans (Orchestrator)

**Rotas disponíveis:**
- `GET  /api/v1/orchestrator/plans` — lista planos
- `POST /api/v1/orchestrator/plans` — cria plano com objetivo, constraints, policy

**O que falta:**
- Nenhuma tela exibe a lista de planos
- Nenhum formulário para criar um plano (objetivo, modo de raciocínio, deadline, policy)
- `ControlCenter` só mostra `runs` — planos são completamente invisíveis no frontend

---

### 1.4 Agents

**Serviço:** `AgentService` (create, list, update, delete, getStats, setState)  
**Rotas:** **Nenhuma rota API exposta**

**O que falta:**
- Rotas: `GET/POST /api/v1/agents`, `GET/PUT/DELETE /api/v1/agents/:id`
- Tela de listagem de agentes com status (idle / running / error), stats (tasks success/failure)
- Formulário de criação/configuração de agente

---

### 1.5 Workflows

**Serviço:** `WorkflowService` (create, list, update, recordExecution, getExecutionHistory, getStats)  
**Rotas:** **Nenhuma rota API exposta**

**O que falta:**
- Rotas: `GET/POST /api/v1/workflows`, `GET /api/v1/workflows/:id/history`
- Tela de workflows com histórico de execuções por workflow

---

## 2. Implementações Parciais em Telas Existentes

### 2.1 ControlCenter — `src/screens/ControlCenter.tsx`

| Funcionalidade | Status |
|---|---|
| Listar runs ativos/recentes | ✅ Implementado |
| Pausar run ativo | ✅ Implementado |
| **Retomar run pausado** (`POST /api/v1/orchestrator/runs/:id/resume`) | ❌ Rota existe, sem botão |
| **Criar novo run** (`POST /api/v1/orchestrator/runs`) | ❌ Sem formulário |
| **Detalhe de run** (`GET /api/v1/orchestrator/runs/:id`) | ❌ Sem tela/modal |
| **Checkpoints de run** (`GET /api/v1/orchestrator/runs/:id/checkpoints`) | ❌ Rota existe, sem UI |
| **Auditoria de policy** (`OrchestratorRuntimeService.listPolicyAudits`) | ❌ Sem rota e sem UI |
| **Lista de planos** (vinculada a runs) | ❌ Planos são invisíveis |

---

### 2.2 MemoryLedger — `src/screens/MemoryLedger.tsx`

| Funcionalidade | Status |
|---|---|
| Listar histórico | ⚠️ UI ok, mas `ChatHistoryService` é um **stub** — retorna `[]` sempre |
| Salvar nova entrada | ⚠️ POST enviado, mas `saveHistory()` é no-op |
| **Persistência real** | ❌ `ChatHistoryService` precisa ser implementado com TypeORM |
| **Deletar entrada** | ❌ Sem rota e sem botão |
| **Backup / recover** | ❌ Métodos existem no serviço, sem UI |

---

### 2.3 Observers — `src/screens/Observers.tsx`

| Funcionalidade | Status |
|---|---|
| Listar observers | ✅ Implementado |
| Ativar / desativar | ✅ Implementado |
| **Logs por observer** | ❌ Sem endpoint, sem modal de log |
| **Observers reais** | ⚠️ Os 3 observers (`fs`, `terminal`, `api`) são estado em memória na rota — não refletem `fileWatcher.ts` ou `EventBus.ts` reais |
| **Persistência de estado** | ❌ Estado perdido em cada restart do servidor |

---

### 2.4 SystemConfig — `src/screens/SystemConfig.tsx`

| Funcionalidade | Status |
|---|---|
| Ler feature flags | ✅ Implementado |
| Salvar feature flags | ⚠️ Funciona, mas **salva em memória** — perdido no restart |
| **Persistência de flags** | ❌ `PATCH /api/v1/settings` não persiste em arquivo ou banco |
| **Gestão de API Keys** | ❌ `ApiKeyService` (generate, revoke, list) — sem rota, sem UI |
| **Gestão de membros do workspace** | ❌ `WorkspaceService.addMember/removeMember/updateMemberRole` — sem rota, sem UI |

---

### 2.5 Dashboard — `src/screens/Dashboard.tsx`

| Funcionalidade | Status |
|---|---|
| Status de saúde | ✅ Implementado |
| Memória e uptime | ✅ Implementado |
| Histórico recente (3 entradas) | ⚠️ Sempre vazio (ChatHistoryService stub) |
| **Load avg e threads** | ⚠️ Buscados via `/api/v1/metrics` mas não exibidos no Dashboard (só em SystemConfig) |
| **Runs ativos em tempo real** | ❌ Sem polling/WebSocket para status ao vivo |
| **Estatísticas de agentes** | ❌ `AgentService.getStats()` disponível, sem rota nem widget |
| **Estatísticas de workflows** | ❌ `WorkflowService.getStats()` disponível, sem rota nem widget |

---

## 3. Serviços Backend Totalmente Sem Frontend

Esses serviços existem em `src/core/services/` com lógica completa, sem nenhuma rota API exposta e sem tela:

| Serviço | Capacidades disponíveis |
|---|---|
| `SecurityAnalysisService` | Análise de vulnerabilidades (SQLi, XSS, secrets) |
| `AdvancedSecurityAnalysisService` | Análise AI em 5 fases (pattern + AI + attack vectors + threat modeling + recomendações) |
| `AttackSimulationFramework` | Simulação de ataques controlados (red-team) |
| `ContextService` | CRUD de context entries por projeto (search semântico incluído) |
| `ActionLogService` | Logs de ações por pipeline e fase |
| `DecisionService` | Histórico de decisões por projeto |
| `MetricsService` | Métricas do sistema (existe serviço dedicado; frontend usa `os` direto) |
| `SnapshotService` | Criar e restaurar snapshots de estado |
| `RollbackService` | Rollback de execuções |
| `RetentionPolicyService` | Políticas de retenção de dados |
| `StreamingChatService` | Chat com streaming de tokens (SSE/WebSocket) |
| `WebSocketServer` | Updates em tempo real — nenhum componente React conectado |
| `UserService` | CRUD de usuários, updateLastLogin |
| `DiagnosticPipelineService` | Pipeline de diagnóstico de erros |
| `SafetyNetIntegrationService` | Safety net para execuções críticas |
| `ModelFallbackService` | Fallback entre modelos de AI |
| `AutoSyncService` / `ChatSyncService` | Sincronização de estado/chat |

---

## 4. Itens de Infraestrutura de Frontend

| Item | Status |
|---|---|
| WebSocket / SSE para updates em tempo real | ❌ Ausente |
| Polling automático para runs ativos | ❌ Ausente (telas só buscam 1x no mount) |
| Tela de detalhe com drill-down (run → checkpoints → logs) | ❌ Ausente |
| Navegação por workspaceId (contexto global de workspace) | ❌ Ausente — `apiFetch` não carrega workspaceId de contexto |
| Tratamento de erros 401 nas rotas que ainda têm `requireAuth` | ❌ `GET /api/v1/workspaces/:id` ainda requer auth |
| Paginação nas listas (runs, plans, history) | ❌ Ausente |

---

## Prioridade Sugerida

```
P0 — ChatHistoryService (stub) → implementar com TypeORM real
P0 — Persistência de feature flags (PATCH /settings → arquivo ou DB)
P1 — Tela de Workspaces + Projects (CRUD básico)
P1 — Tela de Plans (lista + criar plano com objetivo)
P1 — Resume run no ControlCenter
P2 — Tela de Agents (lista, status, stats)
P2 — Rotas e UI para ContextService (busca de contexto por projeto)
P2 — Rotas e UI para ActionLogService (audit trail)
P3 — WebSocket / SSE para dashboard ao vivo
P3 — SecurityAnalysisService — UI para iniciar scan e ver resultado
P3 — ApiKeyService — UI de gestão de chaves
```
