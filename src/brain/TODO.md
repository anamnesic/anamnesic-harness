# TODO - Brain Modules para Packages

## Pacotes a Criar/Extrair da pasta `brain`

### 1. `@kairos/brain-query-engine`
- [ ] Extrair `QueryEngine.ts` como pacote independente
- [ ] Extrair `query.ts` (query loop, streaming, tool execution, compaction)
- [ ] Extrair pasta `query/` (config, dependencies, transitions, stop hooks, token budget)
- [ ] Separar lógica de streaming e fallback de modelos
- [ ] Isolar sistema de transcrição e gravação de sessão

### 2. `@kairos/brain-tools`
- [ ] Extrair registry de tools (`tools.ts`)
- [ ] Extrair `Tool.ts` (interface base e tipos)
- [ ] Migrar tools individuais da pasta `tools/`:
  - [ ] BashTool
  - [ ] FileReadTool
  - [ ] FileEditTool
  - [ ] FileWriteTool
  - [ ] GrepTool
  - [ ] GlobTool
  - [ ] AgentTool
  - [ ] TodoWriteTool
  - [ ] TaskCreate/Get/Update/List/Stop/Output tools
  - [ ] SkillTool
  - [ ] WebFetchTool
  - [ ] WebSearchTool
  - [ ] LSPTool (feature-gated)
  - [ ] [ ] Todas as 43+ tools
- [ ] Criar sistema de registro de tools pluginável

### 3. `@kairos/brain-commands`
- [ ] Extrair registry de commands (`commands.ts`)
- [ ] Migrar commands individuais da pasta `commands/`:
  - [ ] /help, /model, /compact, /cost, /mcp, /skills, /vim, /theme
  - [ ] /login, /logout, e todos os 60+ commands
- [ ] Implementar 16 stub commands desabilitados:
  - [ ] teleport
  - [ ] share
  - [ ] env
  - [ ] onboarding
  - [ ] ant-trace
  - [ ] autofix-pr
  - [ ] backfill-sessions
  - [ ] break-cache
  - [ ] bughunter
  - [ ] ctx_viz
  - [ ] debug-tool-call
  - [ ] good-kairos
  - [ ] issue
  - [ ] mock-limits
  - [ ] oauth-refresh
  - [ ] perf-issue
  - [ ] summary
- [ ] Criar sistema de registro de commands pluginável

### 4. `@kairos/brain-ui`
- [ ] Extrair componentes Ink/React da pasta `components/` (144 arquivos)
- [ ] Extrair screens (`screens/REPL.tsx`, `Doctor.tsx`, `ResumeConversation.tsx`)
- [ ] Extrair design system (themed box, text, colors)
- [ ] Extrair sistema de virtual scrolling
- [ ] Extrair diff viewers
- [ ] Extrair dialogs e pickers
- [ ] Extrair `ink.ts` (wrapper Ink com theming)

### 5. `@kairos/brain-hooks`
- [ ] Extrair hooks React da pasta `hooks/` (85 arquivos)
- [ ] Tool permissions hooks
- [ ] Input handling hooks
- [ ] Session management hooks
- [ ] Voice integration hooks
- [ ] Vim mode hooks
- [ ] Settings change detection hooks
- [ ] Remote session handling hooks

### 6. `@kairos/brain-state`
- [ ] Extrair sistema de estado da pasta `state/`
- [ ] AppState e store
- [ ] Selectors
- [ ] Integrar com gerenciamento de estado preferido (Zustand/Redux)

### 7. `@kairos/brain-keybindings`
- [ ] Extrair sistema de keybindings da pasta `keybindings/`
- [ ] Parsing de keybindings
- [ ] Matching e resolução
- [ ] Default bindings
- [ ] Schema de keybindings
- [ ] Suporte a atalhos customizáveis

### 8. `@kairos/brain-vim`
- [ ] Extrair modo Vim da pasta `vim/`
- [ ] Motions
- [ ] Operators
- [ ] Transitions
- [ ] Text objects
- [ ] Integração com editor de input

### 9. `@kairos/brain-services`
- [ ] Extrair serviços da pasta `services/` (36 serviços):
  - [ ] API client
  - [ ] Analytics (GrowthBook, Datadog)
  - [ ] MCP server management
  - [ ] OAuth
  - [ ] Plugins manager
  - [ ] Compaction service
  - [ ] Tips service
  - [ ] Feature flags service
  - [ ] Diagnostic tracking

### 10. `@kairos/brain-mcp`
- [ ] Extrair integração MCP
- [ ] MCP server connections
- [ ] MCP resources
- [ ] MCP tools
- [ ] MCP skills (feature-gated)
- [ ] Validações e utils MCP

### 11. `@kairos/brain-plugins`
- [ ] Extrair sistema de plugins
- [ ] Built-in plugins
- [ ] Bundled plugins
- [ ] Hot-reload de plugins
- [ ] Versionamento de plugins

### 12. `@kairos/brain-skills`
- [ ] Extrair sistema de skills
- [ ] Bundled skills
- [ ] Skill directory loading
- [ ] MCP skill builders
- [ ] Skill search (experimental, feature-gated)

### 13. `@kairos/brain-memdir`
- [ ] Extrair sistema de memória da pasta `memdir/`
- [ ] Memory scanning
- [ ] Memory aging
- [ ] Relevant memory finding
- [ ] Memory paths
- [ ] Integração com kairos.md

### 14. `@kairos/brain-bridge`
- [ ] Extrair remote control bridge da pasta `bridge/`
- [ ] Comunicação bidirecional local CLI ↔ remote clients
- [ ] WebSocket sessions
- [ ] Permission bridging
- [ ] Remote session management

### 15. `@kairos/brain-cli`
- [ ] Extrair CLI transport layers da pasta `cli/`
- [ ] WebSocket transport
- [ ] SSE transport
- [ ] HybridTransport
- [ ] Structured I/O
- [ ] Event uploaders
- [ ] Print/output utilities

### 16. `@kairos/brain-remote`
- [ ] Extrair remote session management da pasta `remote/`
- [ ] WebSocket sessions
- [ ] Permission bridging
- [ ] SSH remote sessions (feature-gated)
- [ ] Pending connection state

### 17. `@kairos/brain-coordinator`
- [ ] Extrair coordinator mode da pasta `coordinator/`
- [ ] Multi-worker orchestration
- [ ] System prompt para coordenação
- [ ] Worker management logic

### 18. `@kairos/brain-buddy`
- [ ] Extrair buddy/companion system da pasta `buddy/`
- [ ] Sprite system
- [ ] Companion types
- [ ] Notification hook
- [ ] Feature-gated (BUDDY)

### 19. `@kairos/brain-voice`
- [ ] Extrair voice mode da pasta `voice/`
- [ ] Voice mode enablement
- [ ] Integração com voice hooks
- [ ] Feature-gated (VOICE_MODE)

### 20. `@kairos/brain-compaction`
- [ ] Extrair sistemas de compactação
- [ ] Auto-compact
- [ ] Micro-compact
- [ ] Reactive compact (feature-gated)
- [ ] Context collapse (feature-gated)
- [ ] History snip (feature-gated)
- [ ] Cached microcompact (feature-gated)

### 21. `@kairos/brain-context`
- [ ] Extrair context builders (`context.ts` e pasta `context/`)
- [ ] Git status context
- [ ] kairos.md files context
- [ ] Date/time context
- [ ] Memoized async fetchers

### 22. `@kairos/brain-tasks`
- [ ] Extrair task system (`tasks.ts`, `Task.ts`, pasta `tasks/`)
- [ ] LocalShellTask
- [ ] LocalAgentTask
- [ ] RemoteAgentTask
- [ ] DreamTask
- [ ] Task registry

### 23. `@kairos/brain-cost`
- [ ] Extrair cost tracking (`cost-tracker.ts`, `costHook.ts`)
- [ ] API cost tracking
- [ ] Budget enforcement
- [ ] Token budgeting (feature-gated)

### 24. `@kairos/brain-migrations`
- [ ] Extrair migrations da pasta `migrations/`
- [ ] Model string migrations
- [ ] Settings migrations
- [ ] Feature opt-in resets
- [ ] 10 migrations existentes

### 25. `@kairos/brain-types`
- [ ] Extrair type definitions da pasta `types/`
- [ ] Commands types
- [ ] Hooks types
- [ ] IDs types
- [ ] Logs types
- [ ] Permissions types
- [ ] Plugins types
- [ ] Text input types
- [ ] Generated events types

### 26. `@kairos/brain-constants`
- [ ] Extrair constantes da pasta `constants/`
- [ ] Tool names
- [ ] Messages
- [ ] Prompts
- [ ] Output styles
- [ ] OAuth constants
- [ ] XML tags

### 27. `@kairos/brain-utils`
- [ ] Extrair utilitários da pasta `utils/`
- [ ] Funções auxiliares diversas
- [ ] Helpers de formatação
- [ ] Helpers de validação

### 28. `@kairos/brain-schemas`
- [ ] Extrair schemas da pasta `schemas/`
- [ ] Validation schemas
- [ ] Type-safe schemas

### 29. `@kairos/brain-output-styles`
- [ ] Extrair output styles da pasta `outputStyles/`
- [ ] Definições de estilo de output
- [ ] Theming de output

### 30. `@kairos/brain-upstreamproxy`
- [ ] Extrair upstream proxy da pasta `upstreamproxy/`
- [ ] Proxy relay logic

### 31. `@kairos/brain-assistant`
- [ ] Extrair assistant mode da pasta `assistant/`
- [ ] Session history fetching
- [ ] Gate para KAIROS mode
- [ ] Feature-gated (KAIROS)

### 32. `@kairos/brain-server`
- [ ] Extrair server components da pasta `server/`
- [ ] Direct connect session management
- [ ] Feature-gated (DIRECT_CONNECT)

### 33. `@kairos/brain-entrypoints`
- [ ] Extrair entrypoints da pasta `entrypoints/`
- [ ] CLI entrypoint
- [ ] SDK entrypoint
- [ ] MCP entrypoint
- [ ] Sandbox entrypoint

## Feature Flags a Implementar

- [ ] KAIROS - Assistant/chat mode
- [ ] KAIROS_BRIEF - Brief command
- [ ] KAIROS_GITHUB_WEBHOOKS - GitHub PR webhook subscriptions
- [ ] KAIROS_PUSH_NOTIFICATION - Push notifications
- [ ] COORDINATOR_MODE - Multi-worker coordination
- [ ] BRIDGE_MODE - Remote control bridge
- [ ] DAEMON - Daemon mode
- [ ] VOICE_MODE - Voice interaction
- [ ] HISTORY_SNIP - History snipping compaction
- [ ] REACTIVE_COMPACT - Reactive compaction
- [ ] CONTEXT_COLLAPSE - Context collapse system
- [ ] WORKFLOW_SCRIPTS - Workflow scripts
- [ ] AGENT_TRIGGERS / AGENT_TRIGGERS_REMOTE - Cron/scheduled triggers
- [ ] MONITOR_TOOL - Monitoring tool
- [ ] PROACTIVE - Proactive features
- [ ] UDS_INBOX - Unix domain socket messaging
- [ ] FORK_SUBAGENT - Subagent forking
- [ ] BUDDY - Buddy companion
- [ ] DIRECT_CONNECT - Direct connection sessions
- [ ] LODESTONE - Deep link URI handling
- [ ] SSH_REMOTE - SSH remote sessions
- [ ] CCR_REMOTE_SETUP - CCR remote setup
- [ ] EXPERIMENTAL_SKILL_SEARCH - Skill search
- [ ] TRANSCRIPT_CLASSIFIER - Auto-mode classification
- [ ] TOKEN_BUDGET - Token budgeting
- [ ] CACHED_MICROCOMPACT - Cached microcompaction
- [ ] TEAMMEM - Team memory
- [ ] COMMIT_ATTRIBUTION - Commit attribution
- [ ] WEB_BROWSER_TOOL - Web browser tool
- [ ] TERMINAL_PANEL - Terminal panel
- [ ] OVERFLOW_TEST_TOOL - Test tool
- [ ] CHICAGO_MCP - Chicago MCP (dogfooding)
- [ ] MCP_SKILLS - MCP skills
- [ ] UPLOAD_USER_SETTINGS - Settings sync upload
- [ ] BREAK_CACHE_COMMAND - Cache breaking (ant-only)

## TODOs Críticos do Código (297 markers)

### Alta Prioridade
- [ ] `main.tsx:2355` - Consolidar prefetches em single bootstrap request
- [ ] `services/api/client.ts:232` - Cache GoogleAuth instance para performance
- [ ] `services/api/withRetry.ts:94` - Resolver stopgap SystemAPIErrorMessage (ANT-344)
- [ ] `services/api/kairos.ts:2085` - Handle citations
- [ ] `tools/AgentTool/AgentTool.tsx:1206` - Encontrar forma mais limpa de expressar lógica
- [ ] `screens/REPL.tsx:3108,3125,4114` - Simplificar onSubmit e fixar issues

### Média Prioridade
- [ ] `cli/print.ts:1144` - Clean up mutable array passing
- [ ] `cli/print.ts:1876` - Mover para init message (custom-tool-refactor)
- [ ] `services/analytics/growthbook.ts:330-332` - Remover workaround API format
- [ ] `services/api/errorUtils.ts:126` - Investigar causa raiz
- [ ] `services/compact/compact.ts:1690` - Refatorar para usar isMemoryFilePath()
- [ ] `services/diagnosticTracking.ts:56` - Não cachear mcpClient (pode mudar)
- [ ] `tasks/RemoteAgentTask/RemoteAgentTask.tsx:459` - Fold ExitPlanModeScanner (issue #23985)
- [ ] `components/ResumeTask.tsx:168` - Incluir branch name quando API retornar
- [ ] `components/ScrollKeybindingHandler.tsx:568` - Implementar `/`, n/N search
- [ ] `Tool.ts:398` - Tornar propriedade required (TungstenTool fix)
- [ ] `keybindings/shortcutFormat.ts:9` - Remover fallback após migration
- [ ] `state/AppStateStore.ts:172` - Usar DeepReadonly

### Baixa Prioridade
- [ ] `services/mcp/xaa.ts` - Upstream validation to SDK (3 TODOs)
- [ ] `services/mcp/utils.ts:357` - Investigar bug no e2e test
- [ ] `services/oauth/auth-code-listener.ts:114` - Trocar URL quando error page existir
- [ ] `tools/AgentTool/forkSubagent.ts:154` - Resolver pattern [tool_result, text]
- [ ] `skills/bundled/scheduleRemoteAgents.ts:31` - Revisar antes de ship público

## Próximos Passos Sugeridos

1. **Fase 1**: Criar packages core
   - `@kairos/brain-query-engine`
   - `@kairos/brain-tools`
   - `@kairos/brain-commands`
   - `@kairos/brain-state`

2. **Fase 2**: Criar packages UI/UX
   - `@kairos/brain-ui`
   - `@kairos/brain-hooks`
   - `@kairos/brain-keybindings`
   - `@kairos/brain-vim`

3. **Fase 3**: Criar packages de serviços
   - `@kairos/brain-services`
   - `@kairos/brain-mcp`
   - `@kairos/brain-plugins`
   - `@kairos/brain-skills`

4. **Fase 4**: Criar packages de infraestrutura
   - `@kairos/brain-bridge`
   - `@kairos/brain-cli`
   - `@kairos/brain-remote`
   - `@kairos/brain-coordinator`

5. **Fase 5**: Criar packages auxiliares
   - `@kairos/brain-memdir`
   - `@kairos/brain-context`
   - `@kairos/brain-tasks`
   - `@kairos/brain-cost`
   - `@kairos/brain-migrations`
   - `@kairos/brain-types`
   - `@kairos/brain-constants`
   - `@kairos/brain-utils`
   - `@kairos/brain-schemas`
   - `@kairos/brain-output-styles`
   - `@kairos/brain-upstreamproxy`
   - `@kairos/brain-assistant`
   - `@kairos/brain-server`
   - `@kairos/brain-entrypoints`
   - `@kairos/brain-compaction`
   - `@kairos/brain-buddy`
   - `@kairos/brain-voice`
