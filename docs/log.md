Created 5 todos

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/docs/FRONTEND-GAPS.md#1-1), lines 1 to 100

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/screens)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/app/api/v1)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/docs/FRONTEND-GAPS.md#100-100), lines 100 to 195

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/app/api/v1/agents)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/app/api/v1/workflows)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/screens/Agents.tsx#1-1), lines 1 to 100

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/screens/Workflows.tsx#1-1), lines 1 to 100

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/screens/Security.tsx#1-1), lines 1 to 100

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/screens/ControlCenter.tsx#1-1), lines 1 to 100

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/screens/Dashboard.tsx#1-1), lines 1 to 80

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/screens/DecisionsPanel.tsx#1-1), lines 1 to 60

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/App.tsx#1-1), lines 1 to 50

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/app/api/v1/orchestrator)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/app/api/v1/security)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/App.tsx#50-50), lines 50 to 183

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/services)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/services/ChatHistoryService.ts)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/services/StreamingChatService.ts#1-1), lines 1 to 80

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/services/WebSocketServer.ts#1-1), lines 1 to 80

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/lib/usePolling.ts)

Searched for text `useEventStream` (`**/src/lib/**`), 1 result

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/app/api/v1/events)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/lib/useEventStream.ts)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/app/api/v1/events/route.ts#1-1), lines 1 to 60

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/services/SnapshotService.ts#1-1), lines 1 to 100

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/services/ActionLogService.ts)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/agents/index.ts)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/pipeline.ts#1-1), lines 1 to 60

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/chat.ts#1-1), lines 1 to 80

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/app/api/chat/history)

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/screens/ApiKeys.tsx#1-1), lines 1 to 80

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/services/OrchestratorRuntimeService.ts#1-1), lines 1 to 60

Read [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/src/core/services/TaskService.ts#1-1), lines 1 to 60

Starting: *Create TODO.md gap analysis* (5/5)

Tenho todo o contexto necessário. Vou criar o documento agora. 

Created [](file:///c%3A/Users/luann/Documents/GitHub/thinkcoffee/docs/ROADMAP.md)

Completed: *Create TODO.md gap analysis* (5/5)

Criado em ROADMAP.md. Aqui está o resumo do que foi mapeado:

---

## Diagnóstico geral

O projeto tem a **estrutura certa** — serviços bem modelados, entidades TypeORM, SSE funcionando — mas está numa fase de "façade": a UI existe, as telas existem, mas os circuitos não estão fechados. O agente não age, o chat não pensa, e o contexto de identidade (quem é o usuário, qual workspace está ativo) nunca é propagado.

## Os 4 bloqueadores P0

1. **Chat sem LLM** — `StreamingChatService` existe mas usa Hono; precisa de uma rota App Router que conecte input → LLM → SSE stream
2. **Loop de execução no-op** — `OrchestratorRuntimeService` existe mas `executeRun()` não chama nada de verdade; o agente nunca age
3. **workspaceId hardcoded** — todo o sistema usa `'system'` fixo; sem contexto de workspace propagado, multi-tenancy é impossível
4. **Settings em memória** — qualquer reinício do servidor apaga feature flags, modelo configurado, chaves

## O que P1–P3 cobrem
- Planos + aprovação visíveis no ControlCenter
- Observers reais conectados ao EventBus
- Tasks visíveis com drill-down
- Workflow triggers (cron/event) funcionando
- Security scan com código real do projeto
- Autenticação, paginação, onboarding, e SSE expandido

Made changes.