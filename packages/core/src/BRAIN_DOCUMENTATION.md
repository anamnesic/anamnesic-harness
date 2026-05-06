# Documentação do packages/brain

## Visão Geral

O diretório `packages/brain` contém o núcleo do sistema Kairos - o "cérebro" da aplicação. É um módulo monolítico que abriga toda a lógica de processamento, ferramentas, comandos, serviços e interface do usuário.

**Total de arquivos:** ~3000+ arquivos TypeScript/TSX
**Tamanho aproximado:** ~1.5GB
**Status:** Monólito planejado para modularização (ver TODO.md)

---

## Estrutura de Diretórios

### 📂 Arquivos Raiz Principais

| Arquivo | Descrição | Tamanho |
|---------|-----------|---------|
| `main.tsx` | Ponto de entrada principal da aplicação (~4684 linhas) | 803KB |
| `query.ts` | Loop de query, streaming, execução de tools, compactação | 68KB |
| `QueryEngine.ts` | Motor de consulta principal | 46KB |
| `tools.ts` | Registry de ferramentas (BashTool, FileRead, etc.) | 17KB |
| `Tool.ts` | Interface base e tipos para tools | 29KB |
| `commands.ts` | Registry de comandos CLI (/help, /model, etc.) | 25KB |
| `setup.ts` | Configuração inicial da sessão | 20KB |
| `context.ts` | Construtor de contexto (git, kairos.md, data) | 6KB |
| `interactiveHelpers.tsx` | Helpers para interface interativa | 57KB |
| `dialogLaunchers.tsx` | Lançadores de diálogos da UI | 22KB |
| `history.ts` | Gerenciamento de histórico | 14KB |
| `cost-tracker.ts` | Rastreamento de custos de API | 10KB |
| `tasks.ts` | Registry de tarefas | 3KB |
| `Task.ts` | Interface base para tarefas | 3KB |
| `ink.ts` | Wrapper do Ink com theming | 3KB |
| `TODO.md` | Lista de TODOs e planos de modularização | 12KB |

---

### 📂 Subdiretórios Principais

#### 1. **tools/** (44 diretórios)
Ferramentas disponíveis para o agente:

| Tool | Descrição |
|------|-----------|
| `BashTool/` | Execução de comandos bash |
| `FileReadTool/` | Leitura de arquivos |
| `FileEditTool/` | Edição de arquivos |
| `FileWriteTool/` | Escrita de arquivos |
| `GrepTool/` | Busca de conteúdo (ripgrep) |
| `GlobTool/` | Busca de arquivos por padrão |
| `AgentTool/` | Gerenciamento de agentes/subagentes |
| `TodoWriteTool/` | Escrita de TODOs |
| `WebFetchTool/` | Busca em URLs |
| `WebSearchTool/` | Busca na web (Exa AI) |
| `LSPTool/` | Integração LSP (feature-gated) |
| `AskUserQuestionTool/` | Fazer perguntas ao usuário |
| `ConfigTool/` | Gerenciamento de configurações |
| `EnterPlanModeTool/` | Entrar em modo plano |
| `ExitPlanModeTool/` | Sair do modo plano |
| `EnterWorktreeTool/` | Entrar em worktree |
| `ExitWorktreeTool/` | Sair de worktree |
| `ListMcpResourcesTool/` | Listar recursos MCP |
| `McpAuthTool/` | Autenticação MCP |
| ... e muitas outras | +43 tools no total |

#### 2. **commands/** (88 diretórios)
Comandos slash (/) disponíveis no REPL:

| Comando | Descrição |
|---------|-----------|
| `/help` | Exibir ajuda |
| `/model` | Trocar modelo de IA |
| `/compact` | Compactar contexto |
| `/cost` | Mostrar custos |
| `/mcp` | Gerenciar servidores MCP |
| `/skills` | Gerenciar skills |
| `/vim` | Ativar/desativar modo Vim |
| `/theme` | Trocar tema |
| `/login` | Fazer login |
| `/logout` | Fazer logout |
| ... e muitos outros | +60 comandos no total |

**16 comandos stub desabilitados:**
- `/teleport`, `/share`, `/env`, `/onboarding`, `/ant-trace`, `/autofix-pr`, `/backfill-sessions`, `/break-cache`, `/bughunter`, `/ctx_viz`, `/debug-tool-call`, `/good-kairos`, `/issue`, `/mock-limits`, `/oauth-refresh`, `/perf-issue`, `/summary`

#### 3. **services/** (22 diretórios)
Serviços de infraestrutura:

| Serviço | Descrição |
|---------|-----------|
| `api/` | Cliente API (bootstrap, files, referral) |
| `analytics/` | Analytics (GrowthBook, Datadog) |
| `mcp/` | Gerenciamento de servidores MCP |
| `oauth/` | Autenticação OAuth |
| `plugins/` | Gerenciador de plugins |
| `compact/` | Serviço de compactação |
| `tips/` | Serviço de dicas |
| `diagnosticTracking.ts` | Rastreamento diagnóstico |
| `AgentSummary/` | Resumo de agentes |
| `autoDream/` | Sonhos automáticos |
| `extractMemories/` | Extração de memórias |
| `lsp/` | Integração LSP |
| `MagicDocs/` | Documentos mágicos |
| `mockRateLimits.ts` | Limites de taxa simulados |
| `notifier.ts` | Notificações |
| `internalLogging.ts` | Logging interno |
| `claudeAiLimits.ts` | Limites da API Claude AI |
| `awaySummary.ts` | Resumo quando ausente |

#### 4. **components/** (144 arquivos)
Componentes React/Ink para a UI:

- Design system (themed box, text, colors)
- Virtual scrolling
- Diff viewers
- Dialogs e pickers
- Terminal components
- Input components

#### 5. **screens/**
Telas da aplicação:

- `REPL.tsx` - REPL principal
- `Doctor.tsx` - Tela de diagnóstico
- `ResumeConversation.tsx` - Retomar conversa

#### 6. **hooks/** (85 arquivos)
Hooks React para:

- Permissões de ferramentas
- Manipulação de input
- Gerenciamento de sessão
- Integração de voz
- Modo Vim
- Detecção de mudanças
- Sessões remotas

#### 7. **state/**
Gerenciamento de estado:

- `AppState.tsx` - Estado principal da aplicação
- Selectors
- Store

#### 8. **keybindings/**
Sistema de atalhos:

- `schema.ts` - Schema de keybindings
- `validate.ts` - Validação
- `defaultBindings.ts` - Atalhos padrão
- `KeybindingContext.tsx` - Contexto de keybindings
- `KeybindingProviderSetup.tsx` - Provider
- `useKeybinding.ts` - Hook de keybinding
- `useShortcutDisplay.ts` - Exibição de atalhos
- `match.ts` - Matching de teclas
- `shortcutFormat.ts` - Formatação de atalhos
- `template.ts` - Templates
- `loadUserBindings.ts` - Carregar atalhos do usuário

#### 9. **vim/**
Modo Vim completo:

- Motions
- Operators
- Transitions
- Text objects
- Integração com editor

#### 10. **skills/**
Sistema de skills:

- `bundled/` - Skills embutidas (debug, claudeInChrome, verify, etc.)
- `bundledSkills.ts` - Registry de skills embutidas
- `loadSkillsDir.ts` - Carregar skills de diretório
- `mcpSkillBuilders.ts` - Builders para skills MCP

**Skills embutidas:**
- `debug.ts` - Debug
- `claudeInChrome.ts` - Claude no Chrome
- `verify.ts` - Verificação
- `verifyContent.ts` - Verificar conteúdo
- `updateConfig.ts` - Atualizar config
- `keybindings.ts` - Keybindings
- `loop.ts` - Loop
- `remember.ts` - Memorizar
- `batch.ts` - Batch
- `scheduleRemoteAgents.ts` - Agendar agentes remotos
- `claudeApi.ts` - API Claude
- `stuck.ts` - Tratamento de travamento
- `loremIpsum.ts` - Lorem Ipsum
- `skillify.ts` - Skillify
- `simplify.ts` - Simplificar
- `claudeApiContent.ts` - Conteúdo da API Claude

#### 11. **memdir/**
Sistema de memória:

- Memory scanning
- Memory aging
- Relevant memory finding
- Memory paths
- Integração com kairos.md

#### 12. **bridge/**
Remote control bridge:

- Comunicação bidirecional local CLI ↔ remote clients
- WebSocket sessions
- Permission bridging
- Remote session management

#### 13. **cli/** (3 subdiretórios)
CLI transport layers:

- WebSocket transport
- SSE transport
- HybridTransport
- Structured I/O
- Event uploaders
- Print/output utilities

#### 14. **remote/**
Gerenciamento de sessões remotas:

- WebSocket sessions
- Permission bridging
- SSH remote sessions (feature-gated)
- Pending connection state

#### 15. **coordinator/**
Modo coordenador (feature-gated: COORDINATOR_MODE):

- Multi-worker orchestration
- System prompt para coordenação
- Worker management logic

#### 16. **buddy/**
Sistema de companheiro (feature-gated: BUDDY):

- Sprite system
- Companion types
- Notification hook

#### 17. **voice/**
Modo voz (feature-gated: VOICE_MODE):

- Voice mode enablement
- Integração com voice hooks

#### 18. **context/** (10 arquivos)
Context builders adicionais:

- `voice.tsx` - Contexto de voz
- `fpsMetrics.tsx` - Métricas FPS
- `promptOverlayContext.tsx` - Overlay de prompt
- `modalContext.tsx` - Contexto de modal
- `QueuedMessageContext.tsx` - Mensagens enfileiradas
- `notifications.tsx` - Notificações
- `overlayContext.tsx` - Overlay
- `mailbox.tsx` - Caixa de entrada
- `stats.tsx` - Estatísticas

#### 19. **tasks/** (7 subdiretórios)
Sistema de tarefas:

- `LocalShellTask/` - Tarefa shell local
- `LocalAgentTask/` - Tarefa de agente local
- `RemoteAgentTask/` - Tarefa de agente remoto
- `DreamTask/` - Tarefa de sonho
- Task registry

#### 20. **assistant/**
Modo assistente (feature-gated: KAIROS):

- Session history fetching
- Gate para KAIROS mode

#### 21. **server/**
Componentes de servidor (feature-gated: DIRECT_CONNECT):

- Direct connect session management

#### 22. **entrypoints/** (3 subdiretórios)
Pontos de entrada:

- CLI entrypoint
- SDK entrypoint
- MCP entrypoint
- Sandbox entrypoint

#### 23. **migrations/**
Migrações:

- Model string migrations
- Settings migrations
- Feature opt-in resets
- 10 migrations existentes

#### 24. **types/** (8 arquivos)
Definições de tipos:

- Commands types
- Hooks types
- IDs types
- Logs types
- Permissions types
- Plugins types
- Text input types
- Generated events types

#### 25. **constants/** (2 arquivos)
Constantes:

- Tool names
- Messages
- Prompts
- Output styles
- OAuth constants
- XML tags

#### 26. **utils/** (~200 arquivos)
Utilitários diversos:

- Funções auxiliares
- Helpers de formatação
- Helpers de validação
- Git utilities
- Auth utilities
- Config utilities
- Platform utilities
- Array utilities
- Messages utilities
- Early input utilities
- Settings utilities
- Skills utilities
- Swarm utilities
- Teammate utilities
- Warning handler
- Startup profiler
- Secure storage
- Managed env
- Worktree mode
- Agent swarms
- Effort utilities
- Fast mode
- Render options
- Session ingress auth
- Asciicast recorder
- And many more...

#### 27. **schemas/**
Schemas de validação type-safe

#### 28. **outputStyles/**
Definições de estilo de output e theming

#### 29. **upstreamproxy/**
Proxy upstream:

- `upstreamproxy.ts` - Proxy logic
- `relay.ts` - Relay logic

#### 30. **native-ts/** (3 subdiretórios)
Módulos nativos TypeScript:

- `file-index/` - Indexação de arquivos
- `color-diff/` - Diferença de cores
- `yoga-layout/` - Layout Yoga (com enums)

#### 31. **bootstrap/**
Inicialização da aplicação

#### 32. **plugins/** (3 subdiretórios)
Sistema de plugins:

- Built-in plugins
- Bundled plugins
- Hot-reload de plugins
- Versionamento de plugins

#### 33. **screens/**
Telas adicionais da aplicação

#### 34. **ink/**
Integração com Ink (React para CLI)

#### 35. **query/** (5 subdiretórios)
Configurações de query:

- Config
- Dependencies
- Transitions
- Stop hooks
- Token budget

---

## Feature Flags

O `packages/brain` utiliza feature flags para controlar funcionalidades experimentais:

### Principais Feature Flags:

| Flag | Descrição | Status |
|------|-----------|--------|
| `KAIROS` | Modo assistente/chat | Feature-gated |
| `KAIROS_BRIEF` | Comando brief | Feature-gated |
| `KAIROS_GITHUB_WEBHOOKS` | Webhooks GitHub PR | Feature-gated |
| `KAIROS_PUSH_NOTIFICATION` | Push notifications | Feature-gated |
| `COORDINATOR_MODE` | Coordenação multi-worker | Feature-gated |
| `BRIDGE_MODE` | Remote control bridge | Feature-gated |
| `DAEMON` | Modo daemon | Feature-gated |
| `VOICE_MODE` | Interação por voz | Feature-gated |
| `HISTORY_SNIP` | History snipping | Feature-gated |
| `REACTIVE_COMPACT` | Compactação reativa | Feature-gated |
| `CONTEXT_COLLAPSE` | Colapso de contexto | Feature-gated |
| `WORKFLOW_SCRIPTS` | Scripts de workflow | Feature-gated |
| `AGENT_TRIGGERS` | Gatilhos cron/agendados | Feature-gated |
| `MONITOR_TOOL` | Ferramenta de monitoramento | Feature-gated |
| `PROACTIVE` | Funcionalidades proativas | Feature-gated |
| `UDS_INBOX` | Unix domain socket messaging | Feature-gated |
| `FORK_SUBAGENT` | Fork de subagentes | Feature-gated |
| `BUDDY` | Companheiro buddy | Feature-gated |
| `DIRECT_CONNECT` | Conexões diretas | Feature-gated |
| `LODESTONE` | Deep link URI handling | Feature-gated |
| `SSH_REMOTE` | Sessões SSH remotas | Feature-gated |
| `TRANSCRIPT_CLASSIFIER` | Classificação automática | Feature-gated |
| `TOKEN_BUDGET` | Orçamento de tokens | Feature-gated |
| `CACHED_MICROCOMPACT` | Microcompactação cacheada | Feature-gated |
| `TEAMMEM` | Memória de equipe | Feature-gated |
| `COMMIT_ATTRIBUTION` | Atribuição de commit | Feature-gated |
| `WEB_BROWSER_TOOL` | Ferramenta navegador | Feature-gated |
| `MCP_SKILLS` | Skills MCP | Feature-gated |
| `BREAK_CACHE_COMMAND` | Quebra de cache (ant-only) | Feature-gated |

---

## Fluxo de Execução

### 1. Inicialização (`main.tsx`)
```
profileCheckpoint('main_tsx_entry')
  ↓
startMdmRawRead() - lê configurações MDM em paralelo
  ↓
startKeychainPrefetch() - pré-carrega keychain OAuth + API keys
  ↓
Imports pesados (~135ms)
  ↓
setup() - configura sessão
```

### 2. Setup (`setup.ts`)
```
Verifica versão Node.js >= 18
  ↓
Configura sessão (cwd, permissions, worktree)
  ↓
Inicia UDS messaging server (se UDS_INBOX habilitado)
  ↓
Carrega configurações remotas gerenciadas
  ↓
Inicializa telemetry após confiança
  ↓
Prefetch: OAuth, Fast Mode, MCP URLs, AWS/GCP credentials
  ↓
Inicializa analytics (GrowthBook)
```

### 3. Context Building (`context.ts`)
```
getSystemContext() - memoized
  ├─ getGitStatus() - status do git (branch, main branch, status, commits)
  └─ getSystemPromptInjection() - cache breaker (se BREAK_CACHE_COMMAND)
  
getUserContext() - memoized
  ├─ getkairosMds() - lê arquivos kairos.md
  └─ getCurrentDate() - "Today's date is..."
```

### 4. Query Loop (`query.ts`, `QueryEngine.ts`)
```
Usuário envia mensagem
  ↓
Anexa contexto (system + user)
  ↓
Streaming da resposta do modelo
  ↓
Execução de tools (se necessário)
  ↓
Compactação (se contexto cheio)
  ↓
Loop continua até resposta final
```

---

## TODOs Críticos (do TODO.md)

### Alta Prioridade
- [ ] Consolidar prefetches em single bootstrap request (`main.tsx:2355`)
- [ ] Cache GoogleAuth instance para performance (`services/api/client.ts:232`)
- [ ] Resolver stopgap SystemAPIErrorMessage (`services/api/withRetry.ts:94`)
- [ ] Handle citations (`services/api/kairos.ts:2085`)
- [ ] Simplificar lógica AgentTool (`tools/AgentTool/AgentTool.tsx:1206`)
- [ ] Simplificar onSubmit e fixar issues (`screens/REPL.tsx:3108,3125,4114`)

### Média Prioridade
- [ ] Clean up mutable array passing (`cli/print.ts:1144`)
- [ ] Mover para init message (`cli/print.ts:1876`)
- [ ] Remover workaround API format (`services/analytics/growthbook.ts:330-332`)
- [ ] Investigar causa raiz (`services/api/errorUtils.ts:126`)
- [ ] Refatorar para usar isMemoryFilePath() (`services/compact/compact.ts:1690`)
- [ ] Não cachear mcpClient (`services/diagnosticTracking.ts:56`)
- [ ] Fold ExitPlanModeScanner (`tasks/RemoteAgentTask/RemoteAgentTask.tsx:459`)
- [ ] Incluir branch name quando API retornar (`components/ResumeTask.tsx:168`)
- [ ] Implementar `/`, n/N search (`components/ScrollKeybindingHandler.tsx:568`)
- [ ] Tornar propriedade required (`Tool.ts:398`)
- [ ] Remover fallback após migration (`keybindings/shortcutFormat.ts:9`)
- [ ] Usar DeepReadonly (`state/AppStateStore.ts:172`)

---

## Plano de Modularização

O TODO.md propõe extrair o monólito em **33+ pacotes independentes**:

### Fase 1: Core
- `@kairos/brain-query-engine`
- `@kairos/brain-tools`
- `@kairos/brain-commands`
- `@kairos/brain-state`

### Fase 2: UI/UX
- `@kairos/brain-ui`
- `@kairos/brain-hooks`
- `@kairos/brain-keybindings`
- `@kairos/brain-vim`

### Fase 3: Serviços
- `@kairos/brain-services`
- `@kairos/brain-mcp`
- `@kairos/brain-plugins`
- `@kairos/brain-skills`

### Fase 4: Infraestrutura
- `@kairos/brain-bridge`
- `@kairos/brain-cli`
- `@kairos/brain-remote`
- `@kairos/brain-coordinator`

### Fase 5: Auxiliares
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

---

## Resumo

O `packages/brain` é o coração do Kairos, contendo:
- **~44 ferramentas** para o agente usar
- **~88 comandos** slash para o usuário
- **~22 serviços** de infraestrutura
- **~144 componentes** UI
- **~85 hooks** React
- **30+ feature flags** para funcionalidades experimentais
- **Sistema completo** de memória, skills, plugins, e muito mais

É um monólito bem estruturado que está planejado para ser modularizado em pacotes menores para melhor manutenibilidade.
