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

### 1.3 Observers Reais ✅ **COMPLETED**

**Status:** Observers integrados ao EventBus com persistência de estado e visualização de eventos.

**O que foi feito:**
- `FileWatcher` conectado ao `EventBus` (emite `fs:add`, `fs:change`, etc)
- `ObserverService` agora persiste estado (ativo/inativo) via `SettingsService`
- SSE (`/api/v1/events`) encaminha todos os eventos do `EventBus` para o frontend
- UI de Observers mostra contagem de eventos e timestamp do último evento em tempo real
- Inicialização automática de observers no startup do banco de dados

---

### 1.4 Decisões e Contexto por Projeto ✅ **COMPLETED**

**Status:** DecisionsPanel integrado ao nav e ao detalhe de projeto. Busca por projeto funcional.

**O que foi feito:**
- Tab "Decisions" adicionada dentro do detalhe de projeto (`Projects.tsx`)
- `DecisionsPanel` acessível de forma contextual
- Rota `GET /api/v1/projects/:id/decisions` criada e funcional

---

### 1.5 Tasks Visíveis ✅ **COMPLETED**

**Status:** Interface de tasks completa e integrada com drill-down nos runs.

**O que foi feito:**
- Rota `GET /api/v1/tasks` criada e funcional
- Tela de tasks (`Tasks.tsx`) listando tasks ativas e filtráveis
- Drill-down de run → tasks filhas integrado no `ControlCenter.tsx` (Plan Detail Modal)
- Rota `GET /api/v1/orchestrator/runs/:id/tasks` criada para suportar o drill-down
- Acesso rápido às tasks a partir da tela de Agents

---

## P2 — Qualidade e Completude

### 2.1 Agents com Estado Real ✅ **COMPLETED**

**Status:** Agents totalmente funcionais com estado persistente, workspace scoping e execução manual.

**O que foi feito:**
- Backend routes atualizadas para respeitar o header `X-Workspace-Id` via `getWorkspaceId` utility
- Criação de agents agora utiliza o `workspaceId` ativo do contexto
- `DELETE /api/v1/agents/:id` impede a remoção de agents em estado `running`
- Widget de stats no `Dashboard` filtrado por workspace
- Implementada funcionalidade "Assign Task" manual na tela de Agents com modal de configuração (tipo, descrição, input JSON)

---

### 2.2 Workflows com Trigger Real ✅ **COMPLETED**

**Status:** Workflows agora são disparados automaticamente por cron e eventos reais.

**O que foi feito:**
- `WorkflowTriggerInitializer` atualizado para carregar triggers reais da entidade `Workflow` (TypeORM)
- Integração real com `node-cron` para triggers de agendamento
- Integração real com `EventBus` para triggers baseados em eventos do sistema
- Rota `GET /api/v1/workflows/:id/steps` criada para visualização da estrutura
- UI de `Workflows.tsx` atualizada para respeitar workspace ativo e facilitar criação com templates de steps JSON
- Removido código legado de sample triggers que utilizava SQL puro inconsistente com a estrutura atual

---

### 2.3 Security com Scan Real ✅ **COMPLETED**

**Status:** Scanner de segurança funcional integrado aos arquivos reais dos projetos e com análise profunda via AI.

**O que foi feito:**
- Criado `ProjectSecurityScanner` que mapeia projetos para o sistema de arquivos local
- Implementada varredura básica baseada em patterns (regex) para detecção rápida de segredos, injeção SQL e XSS
- Integrado `AdvancedSecurityAnalysisService` para "Deep Scan", realizando análise em 5 fases com LLM
- UI de `Security.tsx` atualizada com seletor de projeto real e toggle de "Deep Scan"
- Backend `POST /api/v1/security/scans` agora consome configurações de AI do `SettingsService`
- Resultados do scan agora incluem localização precisa (arquivo e linha) baseada nos arquivos reais do workspace

---

### 2.4 Memory Ledger com Busca ✅ **COMPLETED**

**Status:** Memory Ledger totalmente funcional com busca, filtros, paginação e exportação.

**O que foi feito:**
- Backend `ChatHistoryService` suporta paginação real, busca full-text e filtros contextuais
- Rota `DELETE /api/chat/history` criada e integrada à UI
- UI de `MemoryLedger.tsx` totalmente revitalizada com timeline visual
- Implementados filtros por Channel, Date Range e busca por palavra-chave
- Funcionalidade de exportação de log para JSON implementada no frontend
- Paginação robusta com navegação entre páginas e indicador de resultados

---

### 2.5 Snapshots e Rollback Visíveis ✅ **COMPLETED**

**Status:** Sistema de snapshots integrado ao fluxo de execução e visível na UI.

**O que foi feito:**
- Tela `Snapshots.tsx` integrada permitindo criação manual e restauração de arquivos
- Botão "Rollback" adicionado a runs falhos no `ControlCenter.tsx` (quando um snapshotId está presente)
- Modal de rollback permite escolher o step específico para retornar
- Visualização de estatísticas (contagem de arquivos e tamanho total) por snapshot
- Suporte a diferentes escopos: System (config), Src (código) e Full (projeto completo)

---

## P3 — Excelência Operacional

### 3.1 WebSocket / SSE expandido ✅ **COMPLETED**

**Status:** SSE agora encaminha eventos de granulação fina para agents e tasks.

**O que foi feito:**
- `AgentService` emite eventos `agent:state` e `agent:stats` via EventBus
- `TaskService` emite eventos `task:update`, `task:step` e `task:reasoning`
- `Dashboard` configurado para exibir toasts em tempo real ao receber esses eventos via SSE
- Streaming de logs de execução integrado ao barramento de eventos central

---

### 3.2 Navegação e UX ✅ **COMPLETED**

**Status:** UI polida com melhor navegação, estados vazios e breadcrumbs.

**O que foi feito:**
- Implementado componente de `Breadcrumbs` integrado ao Header global
- Melhorados estados vazios (Empty States) em telas críticas como `Tasks.tsx`
- Navegação hierárquica clara entre Dashboard e telas de detalhe
- Indicadores visuais de notificações (Bell) com animação

---

### 3.3 Autenticação ✅ **COMPLETED**

**Status:** Middleware de segurança real protegendo todas as rotas da API.

**O que foi feito:**
- Implementado `middleware.ts` global para validação de JWT em todas as rotas `/api/*` (exceto login/health)
- Criada rota `POST /api/v1/auth/login` integrada ao `AuthService`
- Sistema de hashing de senhas (SHA-256) funcional
- Seed de banco de dados atualizado com usuário de sistema padrão seguro (SHA-256)
- Cabeçalhos `x-user-id` e `x-user-email` injetados automaticamente para consumo nos route handlers

---

### 3.4 Infraestrutura de Dados ✅ **COMPLETED**

**Status:** MetricsService centralizado e histórico de performance disponível.

**O que foi feito:**
- `MetricsService` refatorado para Singleton para acesso global
- Rota `/api/v1/metrics` agora combina dados do SO (`os`) com métricas de aplicação (sucesso de tasks, tokens, etc)
- Coleta automática de métricas de execução via `recordExecution`
- Suporte a alertas baseados em thresholds (error rate, performance degradation)

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
