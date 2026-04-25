# TODO — Kairos Migration

> Lógica/backend já migrada. Itens abaixo são UI e integrações de loop.

---

## Frontend — Next.js Web App (`src/App.tsx`)

> Toda a UI atual usa dados estáticos/mockados. Precisa conectar às API routes reais.

### 🔴 Auth (bloqueante)

- [ ] Criar tela de Login (`/login`) — formulário email + senha, chama `POST /api/v1/auth/login`
- [ ] Criar tela de Signup (`/signup`) — formulário email + senha + nome completo, chama `POST /api/v1/auth/signup`
- [ ] `AuthProvider` — armazena JWT no `localStorage`, expõe `user`, `token`, `logout()`
- [ ] Middleware de proteção de rotas (`app/middleware.ts`) — redireciona para `/login` se não autenticado
- [ ] Refresh automático do token — chama `POST /api/v1/auth/refresh` antes de expirar

### 🟠 Dashboard (dados reais)

- [ ] Conectar status do agente via `GET /api/health` — substituir "Agent Active & Observing" estático
- [ ] "Recent Actions" — buscar últimas entradas do ledger via `GET /api/chat/history?limit=3`
- [ ] Métricas (latência, carga, memória, uptime) — criar `GET /api/v1/metrics` ou ler de uma fonte real
- [ ] Botão "Apply Optimization" da sugestão proativa — conectar a uma action real

### 🟠 Memory Ledger (dados reais)

- [ ] Listar histórico real via `GET /api/chat/history` com paginação (`limit` / `offset`)
- [ ] Botão "New Entry" — abre modal e chama `POST /api/chat/history` com `channelId` + `message`
- [ ] Filtro por tipo (OBSERVATION / SLEEP CYCLE / etc.)
- [ ] Scroll infinito ou botão "Load more"

### 🟠 Observers (dados reais)

- [ ] Criar `GET /api/v1/observers` — retorna status dos watchers ativos (FS, Terminal, API)
- [ ] Criar `PATCH /api/v1/observers/:id` — ativa/desativa um observer
- [ ] Conectar os toggles da UI às rotas acima
- [ ] Mostrar path real monitorado pelo FS Watcher

### 🟠 Control Center — Safety (dados reais)

- [ ] Listar planos/runs do orquestrador via `GET /api/v1/orchestrator/plans`
- [ ] "Audit Stream" — buscar runs recentes via `GET /api/v1/orchestrator/runs`
- [ ] Botão "Authorize" — chama `POST /api/v1/orchestrator/runs/:runId/execute`
- [ ] Botão "Discard" — chama `POST /api/v1/orchestrator/runs/:runId/pause`
- [ ] Criar `GET /api/v1/orchestrator/runs/:runId/audit` — policy audits por run

### 🟠 System Config (dados reais)

- [ ] Criar `GET /api/v1/settings` — lê flags de `src/config/featureFlags.ts` e `settings.ts`
- [ ] Criar `PATCH /api/v1/settings` — persiste alterações de flags e configurações
- [ ] Conectar toggles "Autonomous Modification", "Deep Retrieval", "JIT Engine" às flags reais
- [ ] Botão "Commit changes" — chama `PATCH /api/v1/settings`
- [ ] Métricas de hardware (CPU, MEM, threads, uptime) — criar endpoint ou usar `process` do Node

### 🟡 UX / Infraestrutura de UI

- [ ] Sistema de notificações (toast) — o ícone de sino no Header não faz nada
- [ ] Loading skeletons em todas as telas enquanto os dados carregam
- [ ] Tratamento de erro global — exibir mensagem quando API retorna erro
- [ ] Extrair cada tela em arquivo separado (`app/dashboard/`, `app/ledger/`, etc.)
- [ ] Criar hook `useApi(url)` — wrapper de `fetch` com token JWT injetado automaticamente
- [ ] Tema claro/escuro — variáveis CSS já existem, falta o toggle e `prefers-color-scheme`

---

## Alta prioridade (backend original)

### Chat com Ferramentas

- [x] `chatWithTools(conversationId, message, onEvent)` — `src/core/chat/chatWithTools.ts`
- [x] Registrar `read_pdf` como tool no loop do agente — `src/core/chat/toolRegistry.ts`
- [x] Injetar skills no `systemPrompt` antes de cada turno — via `buildSkillsPrompt()` em `chatWithTools.ts`
- [x] Injetar ferramentas MCP no `tools[]` antes de cada turno — via `mcpManager.getAllTools()` em `chatWithTools.ts`

---

## Média prioridade

### Model Selector + Settings UI

- [x] Dropdown de modelos agrupado (`auto / recommended / other`) — `src/interfaces/dashboard/views/SettingsPanel.ts`
- [x] Campos por provider: base URL, API key, max tokens, temperatura
- [x] `openai_organization` / `openai_project` opcionais
- [x] Botão `testConnection` inline (`testMultiProviderConnection()`)

### MCP Settings UI

- [x] Adicionar/remover servidores MCP por URL — `src/interfaces/dashboard/views/McpSettingsPanel.ts`
- [x] Conectar/desconectar e ver status + ferramentas disponíveis
- [x] Campos OAuth (client id / secret)

### Sidebar

- [x] Lista de conversas com título e data (criar / deletar / selecionar) — `src/interfaces/dashboard/views/ConversationsSidebarProvider.ts`
- [x] Lista de tasks com progresso de cada step
- [x] Separador Chat / Tasks

---

## Baixa prioridade

### Skills List UI

- [x] Listar skills em `~/.kairos/skills/` — `src/interfaces/dashboard/views/SkillsListPanel.ts`
- [x] Mostrar nome, descrição e status (instalada/não instalada)

---

## Próximos passos (extensão VS Code)

- [ ] Registrar os novos painéis na `src/interfaces/dashboard/extension.ts` (comandos `Kairos.openSettings`, `Kairos.openMcpSettings`, `Kairos.openSkills`)
- [ ] Registrar `ConversationsSidebarProvider` como viewType em `package.json` da extensão VS Code
