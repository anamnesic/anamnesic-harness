# KAIROS — Roadmap para Produto Funcional

> Última revisão: Abril 2026  
> Base: análise do estado atual do frontend (`src/screens/`), backend (`app/api/v1/`) e serviços (`src/core/services/`).  
> Objetivo: mapear o delta entre o que existe e o que é necessário para o conceito funcionar de forma profissional.

---

## Estado Atual — Resumo Executivo

O projeto tem uma base de serviços backend robusta e uma UI funcionalmente parcial.  
Os bloqueadores principais são:

1. **SSE unidirecional** — o agente não age de fato; o frontend só observa polling
2. **Chat sem LLM real** — `ChatHistoryService` salva mensagens mas nenhuma rota integra LLM
3. **Pipeline de execução sem loop real** — `pipeline.ts` existe mas não há execução autônoma ativa
4. **Dados de identidade ausentes** — sem usuário logado, workspaceId global, ou contexto de sessão
5. **Telas secundárias acessíveis apenas por código** — `Workspaces`, `DecisionsPanel`, `ApiKeys` não têm nav entry

---

## P0 — Bloqueadores Críticos (o produto não funciona sem isso)

### 0.1 Chat com LLM Real

**Problema:** não existe nenhuma rota que conecte o frontend a uma LLM. `MemoryLedger` salva texto livre, mas não há inferência.

**O que falta:**

| Item | Onde |
|------|------|
| `POST /api/chat/message` — envia mensagem e recebe resposta | `app/api/chat/message/route.ts` (criar) |
| `GET /api/chat/stream` — SSE com tokens em streaming | `app/api/chat/stream/route.ts` (criar) |
| Integrar `StreamingChatService` com a rota SSE | `src/core/services/StreamingChatService.ts` (adaptar para App Router) |
| Componente `ChatPanel.tsx` com input, histórico e stream | `src/screens/ChatPanel.tsx` (criar) |
| Associar mensagens a `channelId` (por projeto ou workspace) | lógica de roteamento |

**Bloqueio:** `StreamingChatService` usa `Context` do Hono (servidor antigo). Precisa ser adaptado para `ReadableStream` do Next.js App Router.

---

### 0.2 Loop de Execução Autônomo

**Problema:** KAIROS é descrito como um agente que age sem prompt explícito, mas não há nenhum loop rodando. `pipeline.ts` tem a estrutura mas não é chamado por nada.

**O que falta:**

| Item | Onde |
|------|------|
| `POST /api/v1/orchestrator/plans` → criar plano com objetivo real | já existe, mas `AdaptiveOrchestratorService` não chama LLM |
| `POST /api/v1/orchestrator/runs` → executar plano (aguarda aprovação se policy exigir) | já existe, mas execução é no-op |
| `OrchestratorRuntimeService.executeRun()` conectado a `TaskExecutorService` real | serviço existe, sem loop ativo |
| Formulário de criação de plano no `ControlCenter` (objetivo, modo, constraints) | `src/screens/ControlCenter.tsx` (adicionar) |
| Botão "Resume" para runs pausados | `src/screens/ControlCenter.tsx` (botão existe, lógica falta) |

---

### 0.3 Identidade e Contexto de Workspace

**Problema:** toda a arquitetura usa `workspaceId` mas o frontend nunca passa isso. Chamadas à API usam strings hardcoded como `'system'`.

**O que falta:**

| Item | Onde |
|------|------|
| Context global `WorkspaceContext` com workspace ativo | `src/context/WorkspaceContext.tsx` (criar) |
| Seletor de workspace no `Header` (ou tela de onboarding) | `src/App.tsx` |
| `apiFetch` passar `X-Workspace-Id` header automaticamente | `src/lib/api.ts` |
| `GET /api/v1/workspaces` retornar o workspace padrão se só houver um | `app/api/v1/workspaces/route.ts` |
| Seed de workspace `system` na inicialização do banco | `app/api/_lib/db.ts` |

---

### 0.4 Persistência Real de Settings

**Problema:** `PATCH /api/v1/settings` salva em variável de módulo (memória). Reiniciar o servidor apaga todas as configurações.

**O que falta:**

| Item | Onde |
|------|------|
| Entidade `Settings` no TypeORM ou arquivo `settings.json` em disco | `src/core/entities/` ou `src/config/settings.ts` |
| `GET /api/v1/settings` lendo do banco/arquivo | `app/api/v1/settings/route.ts` (reescrever) |
| `PATCH /api/v1/settings` persistindo corretamente | idem |
| Feature flags com chave de provedor AI (OpenAI/Anthropic/etc.) validada no startup | `src/config/featureFlags.ts` |

---

## P1 — Funcionalidade Core (o produto existe mas é limitado sem isso)

### 1.1 Tela de Criação e Visualização de Planos

`ControlCenter` exibe runs mas planos são invisíveis.

**O que falta:**
- Painel "Plans" em `ControlCenter` com lista de planos (objetivo, status, complexityScore, reasoningMode)
- Modal "New Plan" com campos: objetivo (textarea), modo de raciocínio (`analytical`/`creative`/`critical`/`systematic`), deadline opcional, policy (allowCodeExecution, requireApproval)
- Drill-down: plano → runs → checkpoints → logs de ação
- Rota `GET /api/v1/orchestrator/plans/:id/checkpoints` exposta (serviço existe: `getRunCheckpoints`)

---

### 1.2 Pipeline de Aprovação Visível

O sistema tem `requireApproval` e `PolicyDecisionAudit`, mas o usuário nunca vê isso.

**O que falta:**
- Indicador visual de "aguardando aprovação" no run card
- Modal de aprovação com contexto (o que o agente quer fazer, qual policy foi triggada)
- `POST /api/v1/orchestrator/runs/:id/execute` com botão explícito "Approve & Execute"
- Listagem de audits de policy: `GET /api/v1/orchestrator/policy-audits` (criar rota; `listPolicyAudits` existe no serviço)

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
