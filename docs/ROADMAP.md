# KAIROS — Roadmap para Produto Funcional

> Última revisão: Abril 2026  
> Base: análise do estado atual do frontend (`src/screens/`), backend (`app/api/v1/`) e serviços (`src/core/services/`).  
> Objetivo: mapear o delta entre o que existe e o que é necessário para o conceito funcionar de forma profissional.

---

## Estado Atual — Resumo Executivo

O projeto tem uma base de serviços backend robusta e uma UI funcional.  
**Todos os bloqueadores P0 foram resolvidos:**

1. ✅ **Chat com LLM Real** — streaming SSE funcional com ChatPanel
2. ✅ **Loop de Execução Autônomo** — plan generation inteligente via LLM
3. ✅ **Contexto de Workspace** — WorkspaceContext global com selector
4. ✅ **Persistência de Settings** — database-backed configuration
5. ⏳ **Navegação Secundária** — `Workspaces`, `DecisionsPanel`, `ApiKeys` precisam nav entry (P1)

**Status Atual:** Produto funcional com AI real, workspace management, e configuração persistente.

---

## P0 — Bloqueadores Críticos (o produto não funciona sem isso)

### 0.1 Chat com LLM Real ✅ **COMPLETED**

**Status:** Todos os itens implementados e funcionando com streaming em tempo real.

| Item | Status | Localização |
|------|--------|-------------|
| `POST /api/chat/message` — envia mensagem e recebe resposta | ✅ | `app/api/chat/message/route.ts` |
| `GET /api/chat/stream` — SSE com tokens em streaming | ✅ | `app/api/chat/stream/route.ts` |
| Integrar `StreamingChatService` com a rota SSE | ✅ | `src/core/services/StreamingChatServiceNext.ts` |
| Componente `ChatPanel.tsx` com input, histórico e stream | ✅ | `src/screens/ChatPanel.tsx` |
| Associar mensagens a `channelId` (por projeto ou workspace) | ✅ | Implementado com workspace context |

**Observações:** 
- Criado `StreamingChatServiceNext.ts` adaptado para Next.js App Router
- Chat acessível via botão flutuante no Dashboard
- Streaming SSE funcional com histórico persistente

---

### 0.2 Loop de Execução Autônomo ✅ **COMPLETED**

**Status:** Loop autônomo funcional com geração de planos inteligente via LLM.

| Item | Status | Observações |
|------|--------|-------------|
| `POST /api/v1/orchestrator/plans` → criar plano com objetivo real | ✅ | `AdaptiveOrchestratorService` agora usa LLM real |
| `POST /api/v1/orchestrator/runs` → executar plano | ✅ | Execução funcional com task creation |
| `OrchestratorRuntimeService.executeRun()` conectado a `TaskExecutorService` real | ✅ | Loop completo com checkpoints |
| Formulário de criação de plano no `ControlCenter` | ✅ | Implementado com modal completo |
| Botão "Resume" para runs pausados | ✅ | Funcional via `resumeRun()` method |

**Observações:**
- `AdaptiveOrchestratorService` integrado com AI provider para plan generation inteligente
- Loop de execução cria tasks reais e gerencia dependências
- Sistema de checkpoints e resume/pause funcional

---

### 0.3 Identidade e Contexto de Workspace ✅ **COMPLETED**

**Status:** Sistema de workspace completo com persistência e contexto global.

| Item | Status | Localização |
|------|--------|-------------|
| Context global `WorkspaceContext` com workspace ativo | ✅ | `src/context/WorkspaceContext.tsx` |
| Seletor de workspace no `Header` | ✅ | `src/components/WorkspaceSelector.tsx` |
| `apiFetch` passar `X-Workspace-Id` header automaticamente | ✅ | `src/lib/api.ts` |
| `GET /api/v1/workspaces` retornar workspace padrão | ✅ | `app/api/v1/workspaces/route.ts` |
| Seed de workspace `system` na inicialização do banco | ✅ | `app/api/_lib/seed.ts` |

**Observações:**
- Workspace selector dropdown no Header com persistência localStorage
- Todas as chamadas API automaticamente incluem workspace header
- Database seeding cria workspace padrão "Default Workspace"
- Contexto global disponível em toda aplicação

---

### 0.4 Persistência Real de Settings ✅ **COMPLETED**

**Status:** Settings completamente persistidos em banco com suporte para feature flags e configuração de AI providers.

| Item | Status | Localização |
|------|--------|-------------|
| Entidade `Settings` no TypeORM | ✅ | `src/core/entities/Settings.ts` |
| `GET /api/v1/settings` lendo do banco | ✅ | `app/api/v1/settings/route.ts` |
| `PATCH /api/v1/settings` persistindo corretamente | ✅ | `app/api/v1/settings/route.ts` |
| Feature flags com validação de AI provider | ✅ | `src/core/services/SettingsService.ts` |

**Observações:**
- Criada entidade `Settings` com workspace-scoped configuration
- `SettingsService` gerencia feature flags e AI provider settings
- Configurações persistem através de restarts do servidor
- Suporte para diferentes tipos: boolean, string, number, JSON

---

## P1 — Funcionalidade Core (o produto existe mas é limitado sem isso)

### 1.1 Tela de Criação e Visualização de Planos ✅ **COMPLETED**

**Status:** Interface completa de planos com criação e drill-down funcional.

| Item | Status | Observações |
|------|--------|-------------|
| Painel "Plans" em `ControlCenter` | ✅ | Lista planos com objetivo, status, complexityScore |
| Modal "New Plan" completo | ✅ | Todos os campos: objetivo, constraints, priority, deadline, policy |
| Drill-down: plano → runs → checkpoints | ✅ | Modal detalhado com runs e checkpoints |
| `GET /api/v1/orchestrator/plans/:id/checkpoints` | ✅ | Rota criada e integrada ao modal |

**Observações:**
- Plan cards clicáveis com visual drill-down completo
- Modal detalhado mostra runs, checkpoints e state JSON
- Interface de criação de planos com todas as opções necessárias

---

### 1.2 Pipeline de Aprovação Visível ✅ **COMPLETED**

**Status:** Pipeline de aprovação completamente funcional com interface visual.

| Item | Status | Observações |
|------|--------|-------------|
| Indicador visual de "aguardando aprovação" | ✅ | Botão amarelo "Approve & Execute" no run card |
| Modal de aprovação com contexto | ✅ | Exibe plano, policy context e blocked capabilities |
| `POST /api/v1/orchestrator/runs/:id/execute` | ✅ | Botão "Approve & Execute" funcional |
| `GET /api/v1/orchestrator/policy-audits` | ✅ | Rota criada e integrada ao modal |

**Observações:**
- Modal mostra contexto completo: plano objetivo, detalhes da execução, policy audits
- Indicadores visuais claros para runs aguardando aprovação
- Interface de aprovação com segurança e contexto adequado

---

### 1.3 Observers Reais

Os 3 observers (`fs`, `terminal`, `api`) são estado em memória na rota. Não refletem `fileWatcher.ts` ou `EventBus.ts`.

**O que falta:**
- Conectar `fileWatcher.ts` ao `EventBus` e repassar via SSE (`/api/v1/events`)
- Observer de `fs` reportar arquivos modificados em tempo real no frontend
- Modal de log por observer (últimos N eventos do EventBus por tipo)
- Persistir estado de ativo/inativo dos observers no banco ou arquivo

---

### 1.4 Decisões e Contexto por Projeto

`DecisionService` e `ContextService` existem com CRUD completo, mas `DecisionsPanel` não está no nav e não tem rota de acesso a decisões por projeto.

**O que falta:**
- Tab "Decisions" dentro do detalhe de projeto (já existe `ProjectContext`; adicionar tab lateral)
- `DecisionsPanel` acessível via nav ou dentro de Projects
- `GET /api/v1/projects/:id/decisions` (criar rota; `DecisionService.listByProject()` existe)
- Busca semântica em contexto: `GET /api/v1/projects/:id/context?q=` já funciona; adicionar campo de busca na UI

---

### 1.5 Tasks Visíveis

`TaskService` tem CRUD completo mas não há nenhuma tela de tasks.

**O que falta:**
- Painel de tasks por agente ou por workspace (lista com status, tipo, agente responsável)
- `GET /api/v1/tasks?workspaceId=&agentId=&status=` (criar rota)
- Drill-down de run → tasks filhas
- Indicador de progresso de task na tela de agents

---

## P2 — Qualidade e Completude

### 2.1 Agents com Estado Real

`AgentService` tem `setState`, `create`, `delete`, `getStats`. A tela `Agents.tsx` existe e está funcional.

**Gaps restantes:**
- Botão "Create Agent" salva com `workspaceId: 'system'` hardcoded — conectar ao workspace ativo
- `DELETE /api/v1/agents/:id` precisa verificar que agente não está rodando
- `GET /api/v1/agents/stats` já existe — exibir widget no `Dashboard`
- Execução de task manual: botão "Assign Task" em um agente (tipo, descrição, input JSON)

---

### 2.2 Workflows com Trigger Real

`WorkflowService` e `WorkflowTriggerService` existem. `Workflows.tsx` tem CRUD e histórico.

**Gaps restantes:**
- `WorkflowTriggerService.evaluateTriggers()` nunca é chamado — sem cron real
- Trigger `cron`: integrar com `node-cron` ou similar no startup do servidor
- Trigger `event`: conectar ao `EventBus` para disparar workflow em eventos específicos
- `GET /api/v1/workflows/:id/steps` para visualização do grafo de steps (criar rota)
- Indicador de "próxima execução" para workflows com schedule

---

### 2.3 Security com Scan Real

`Security.tsx` está funcional para exibir resultados. `SecurityAnalysisService` e `AdvancedSecurityAnalysisService` existem.

**Gaps restantes:**
- Scan atual é stub — conectar `SecurityAnalysisService.analyzeCode()` a arquivos do projeto selecionado
- `AdvancedSecurityAnalysisService` (análise em 5 fases com AI) nunca é chamado — adicionar opção "Deep Scan"
- `AttackSimulationFramework` completamente desconectado — adicionar como feature flag oculta (P3)
- Filtro por projeto no scan: `targetId` deve ser o projectId selecionado

---

### 2.4 Memory Ledger com Busca

`ChatHistoryService` agora salva via TypeORM (já corrigido). A tela `MemoryLedger` precisa de:

- Paginação real (`GET /api/chat/history?limit=&offset=`)
- Filtro por `channelId` / `type` (`request`/`response`/`info`/`error`/`code`)
- Campo de busca (full-text ou por `channelId`)
- `DELETE /api/chat/history/:id` (criar rota; `deleteEntry()` existe no serviço)
- Exportar histórico como JSON ou Markdown

---

### 2.5 Snapshots e Rollback Visíveis

`SnapshotService` e `RollbackService` existem e têm rotas em `/api/v1/snapshots`.

**Gaps restantes:**
- Nenhuma tela exibe snapshots — criar tab em `ControlCenter` ou painel em Projects
- Botão "Rollback" em um run falho (chamar `POST /api/v1/snapshots/:id/rollback`)
- Mostrar diff de arquivos modificados no snapshot (lista de paths + ação: created/modified/deleted)
- Associar snapshot ao runId para navegação bidirecional

---

## P3 — Excelência Operacional

### 3.1 WebSocket / Socket.io

`WebSocketServer.ts` usa Socket.io (dependência do servidor legado Hono). No App Router (Next.js), a alternativa é:

- Migrar para SSE bidirecional com `EventSource` + `POST` para comandos (padrão atual, mas ampliar)
- **Ou** rodar Socket.io num custom server Next.js (`server.ts`)
- Eventos prioritários para streaming em tempo real: `task-update`, `agent-status`, `workflow-progress`
- `Dashboard` já consome `runs.snapshot` via SSE — estender para `agent-status` e `task-update`

---

### 3.2 Navegação e UX

| Item | Detalhes |
|------|----------|
| Telas secundárias sem acesso via nav | `Workspaces`, `DecisionsPanel` só acessíveis por código |
| `Workspaces` deveria ser entry point obrigatório no first-run | Onboarding flow ausente |
| Breadcrumbs para navegação profunda | Projects → ProjectContext → Entry Detail |
| Paginação em todas as listas | Runs, Plans, Tasks, History |
| Estados vazios informativos | Maioria das telas tem "No X yet" sem próximo passo |
| Notificações push (Bell) sem implementação | `Header` tem bell mas sem evento |

---

### 3.3 Autenticação

`AuthService`, `UserService` e `ApiKeyService` existem. Rotas têm `requireAuth` comentado/removido temporariamente.

**Para produção:**
- Implementar middleware de autenticação real (JWT ou session cookie)
- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- `ApiKeys.tsx` já tem UI — conectar ao workspace ativo (hoje usa `projectId` hardcoded)
- Rate limiting por API Key
- Audit log de autenticação

---

### 3.4 Infraestrutura de Dados

| Item | Status | Ação |
|------|--------|------|
| `RetentionPolicyService` | Serviço existe, sem rota e sem scheduler | Criar `GET/POST /api/v1/retention-policies` + cron |
| `AutoSyncService` / `ChatSyncService` | Existe, desconectado | Definir o que sincronizar e com quem |
| `MetricsService` | `os` usado diretamente na rota; serviço existe | Migrar para `MetricsService` com histórico |
| `ExecutionLogService` | Existe, sem UI | Adicionar ao drill-down de runs/tasks |
| `PersistentEventStore` | Existe (TypeORM), sem consumidor | Conectar ao `EventBus` para persistir eventos críticos |

---

## Resumo de Prioridades

```
P0 — Chat com LLM (rota + streaming + componente)
P0 — Loop de execução real (plano → run → execute → tasks)
P0 — Contexto de workspace global no frontend
P0 — Persistência de settings

P1 — Tela de planos + aprovação visível no ControlCenter
P1 — Observers reais conectados ao EventBus
P1 — Decisões e contexto por projeto acessíveis
P1 — Tasks visíveis (listagem + drill-down)

P2 — Agents com workspace real + assign task manual
P2 — Workflow triggers (cron + event) funcionando
P2 — Security scan real (projeto selecionado → análise de código)
P2 — Memory Ledger com paginação, filtro e busca
P2 — Snapshots e rollback visíveis

P3 — WebSocket ou SSE expandido para task/agent events
P3 — Navegação melhorada (onboarding, breadcrumbs, paginação)
P3 — Autenticação real (JWT/session)
P3 — Retenção e sincronização de dados
```

---

## Arquivos Principais Afetados

| Arquivo | Situação |
|---------|----------|
| `src/core/services/StreamingChatService.ts` | Adaptar para Next.js App Router (remover dep. Hono) |
| `src/core/services/AdaptiveOrchestratorService.ts` | Conectar chamada real à LLM |
| `src/core/services/TaskExecutorService.ts` | Verificar se executa tasks reais ou é stub |
| `app/api/v1/events/route.ts` | Estender SSE para `agent-status` e `task-update` |
| `app/api/_lib/db.ts` | Seed de workspace e settings padrão |
| `src/App.tsx` | Adicionar `WorkspaceContext`, onboarding, nav entry para Workspaces/Decisions |
| `src/screens/ControlCenter.tsx` | Formulário de plano, painel de planos, aprovação, checkpoints |
| `src/screens/Dashboard.tsx` | Widget de tasks ativas, runs ao vivo por SSE expandido |
