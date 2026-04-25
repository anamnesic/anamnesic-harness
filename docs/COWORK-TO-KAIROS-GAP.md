# Cowork → Kairos: Gap Analysis

**Atualizado**: Abril 2026  
**Status**: Migração de lógica/backend concluída. Itens restantes são UI e integrações de loop.

---

## ✅ Já Migrado

| Área | Arquivo no Kairos |
|---|---|
| Multi-provider AI client (6 providers + streaming) | `src/core/providers/multi-provider.ts` |
| Catálogo de 20+ modelos + helpers | `src/config/models.ts` |
| `edit_file` (busca/substituição cirúrgica) | `src/core/tools/file-tools.ts` |
| `glob` + `grep` com context lines | `src/core/tools/search-tools.ts` |
| `docker_run`, `docker_list`, `docker_images` | `src/core/tools/docker-tools.ts` |
| MCP client (connect, tool exec, OAuth, persistência) | `src/core/mcp-client/` |
| Skills system (scan, YAML frontmatter, defaults) | `src/core/skills/` |
| Conversation store CRUD + histórico JSON | `src/memory/conversations/` |
| Task system + agente multi-turno + eventos | `src/core/tasks/` |
| Extração de texto de PDF (`pdf-parse`) | `src/utils/pdf.ts` |

---

## O que Falta Migrar

### 1. Chat com Ferramentas Habilitadas (Tool-Enabled Chat)

O `TaskRunner` existe, mas não há um entry point que conecte o chat normal (conversa livre, não task) ao loop de ferramentas. O cowork tinha `sendChatWithTools` que rodava o agente com as ferramentas durante uma conversa.

- [ ] Função `chatWithTools(conversationId, message, onEvent)` que usa `TaskRunner` + ferramentas do `src/core/tools/`
- [ ] `tool read_pdf` registrada no loop do agente (usando `src/utils/pdf.ts`)
- [ ] Skills auto-injetadas no `systemPrompt` antes de cada turno (usar `buildSkillsPrompt()` de `src/core/skills/`)
- [ ] Ferramentas MCP injetadas dinamicamente no `tools[]` antes de cada turno (usar `mcpManager.listTools()`)

---

### 2. Model Selector UI (modo web/standalone)

Lógica migrada (`src/config/models.ts`, `src/core/providers/multi-provider.ts`). Falta a interface.

- [ ] Componente `ModelSelector` com dropdown agrupado (`auto / recommended / other`)
- [ ] Campos de configuração por provider: base URL, API key, max tokens, temperatura
- [ ] `openai_organization` / `openai_project` opcionais
- [ ] Botão `testConnection` inline (usar `testMultiProviderConnection()`)

---

### 3. MCP Settings UI

Client migrado (`src/core/mcp-client/`). Falta a interface.

- [ ] UI para adicionar/remover servidores MCP por URL
- [ ] Conectar/desconectar e ver status + lista de ferramentas disponíveis
- [ ] Campos OAuth (client id / secret)

---

### 4. Sidebar com Conversas e Tasks

Backend migrado (`src/memory/conversations/`, `src/core/tasks/`). Falta a interface.

- [ ] Lista de conversas com título e data (criar / deletar / selecionar)
- [ ] Lista de tasks com status de cada step
- [ ] Separador Chat / Tasks

---

### 5. Skills List UI

Skills system migrado (`src/core/skills/`). Falta a interface.

- [ ] Listagem de skills instaladas (`~/.kairos/skills/`)
- [ ] Status de cada skill (nome, descrição, instalada/não instalada)

---

## Resumo do que resta

| Área | Prioridade | Esforço |
|---|---|---|
| Chat com ferramentas + skills + MCP injetados | Alta | Médio |
| Model Selector + Settings UI | Média | Baixo |
| MCP Settings UI | Média | Baixo |
| Sidebar conversas + tasks | Média | Baixo |
| Skills List UI | Baixa | Baixo |

---

## O que o Cowork NÃO tem (vantagens do Kairos)

- Integração nativa VS Code (chat panel, comandos, webview)
- LLM Server compatível com Ollama (expõe modelos do Copilot)
- Sistema de memória persistente (`MemoryManager`, `VectorStore`)
- `Recall` / `ContextBuilder` para busca semântica de contexto
- `Sleep` / consolidação noturna de logs
- `Policies` / `ApprovalFlow` / `Guardrails`
- `EventBus` / `FileWatcher` / observers
- Pipeline de CI/CD, deployment, Docker
- MCP **server** (Kairos como ferramenta para outros agentes)

### O que o Cowork tem
`packages/cowork/src/lib/ai-client.ts` — cliente unificado com **6 providers**:

| Provider | Formato API | Auth |
|---|---|---|
| `anthropic` | `/v1/messages` (Anthropic) | `x-api-key` |
| `openai` | `/v1/chat/completions` (OpenAI) | Bearer |
| `google` | Gemini REST | Query param |
| `minimax` | Custom | Bearer |
| `openai-responses` | `/v1/responses` (GPT-5 series) | Bearer |
| `openai-compatible` | `/v1/chat/completions` | Bearer/None |

Funcionalidades do cliente:
- Streaming com SSE para todos os providers
- `discoverModels(baseUrl)` — descobre modelos de serviços locais (`/v1/models`, `/api/tags`)
- `checkLocalServiceStatus(baseUrl)` — verifica se Ollama/localai está rodando
- `testConnection(settings)` — testa conexão por provider

Catálogo de modelos em `stores/settings.ts`:
- 20+ modelos (Claude, GPT-5, Gemini, Grok, Raptor) com grupos: `auto`, `recommended`, `other`
- `getModelInfo(id)`, `getDefaultBaseUrl(id)`, `usesResponsesApi(id)`

### O que o Kairos tem
`src/interfaces/dashboard/agents/OllamaClient.ts` — somente cliente Ollama (`/api/chat`), sem outros providers.  
`src/interfaces/llm-server/` — servidor que **expõe** modelos VS Code, não consome providers externos.

### Gap
- [ ] Cliente para Anthropic direto (sem passar pelo LLM server)
- [ ] Cliente OpenAI / GPT-5 Responses API
- [ ] Cliente Google Gemini
- [ ] Cliente genérico OpenAI-compatible (Ollama, LocalAI, vLLM, OpenRouter, etc.)
- [ ] Catálogo de modelos com metadata (grupos, baseUrl padrão, provider)
- [ ] `discoverModels` / `checkLocalServiceStatus`
- [ ] Chaves por provider (`providerKeys: Record<string, string>`)

---

## 2. Conversation Store com Persistência

### O que o Cowork tem
`stores/chat.ts` + `lib/tauri-api.ts`:
- `Conversation` com `id`, `title`, `created_at`, `updated_at`
- `Message` com `id`, `conversation_id`, `role`, `content`, `timestamp`
- CRUD completo: `createConversation`, `listConversations`, `deleteConversation`, `updateConversationTitle`
- `getMessages(conversationId)` — histórico paginado
- Streaming via evento Tauri `chat-stream`
- Fallback web via `localStorage` quando fora do Tauri

### O que o Kairos tem
`src/interfaces/dashboard/views/SidebarProviders.ts` — painel de chat no VS Code, sem gerenciamento de conversas persistentes.

### Gap
- [ ] Entidade `Conversation` com CRUD
- [ ] Histórico de mensagens por conversa
- [ ] Título automático gerado da primeira mensagem
- [ ] Persistência (banco ou arquivos) fora do SQLite do Cowork

---

## 3. Task System com Agente Multi-turno

### O que o Cowork tem
`lib/tauri-api.ts` — Task API:
- `Task`: `id`, `title`, `description`, `status` (`planning|running|completed|failed`), `plan: PlanStep[]`, `current_step`, `project_path`
- `PlanStep`: `step`, `description`, `status` (`pending|running|completed|failed`)
- `createTask`, `listTasks`, `getTask`, `deleteTask`
- `runTaskAgent(request, onEvent)` — loop de agente com eventos: `text`, `plan`, `step_start`, `step_done`, `tool_start`, `tool_end`, `turn_complete`, `done`, `error`
- `getTaskMessages(taskId)` — histórico de mensagens por tarefa

Backend Rust (`agent/agent_loop.rs`, `agent/types.rs`):
- Loop de agente real com até N turnos
- Parsing do plano em `<plan>` tags
- Execução passo a passo com marcadores `[STEP N START/DONE]`
- Emissão de eventos via `mpsc` para o frontend

### O que o Kairos tem
`src/interfaces/dashboard/agents/AutonomousRuntime.ts` — runtime de workflows com steps e fases, mas focado em pipelines pré-definidos (não em tarefas livres com plano gerado dinamicamente).  
`src/interfaces/dashboard/utils/pmServices.ts` — serviços de pipeline.

### Gap
- [ ] Entidade `Task` com `plan: PlanStep[]` e `current_step`
- [ ] `TaskPanel` UI (criação, listagem, progresso visual de steps)
- [ ] `runTaskAgent` com loop multi-turno e parsing automático de plano em `<plan>` tags
- [ ] Histórico de mensagens por tarefa (separado das conversas)
- [ ] Eventos granulares `step_start` / `step_done` / `tool_start` / `tool_end`

---

## 4. Chat com Ferramentas (Tool-Enabled Chat)

### O que o Cowork tem
`EnhancedChatRequest` + `sendChatWithTools`:
- Habilita o agente Rust para executar ferramentas durante um chat normal
- Eventos: `text`, `tool_start`, `tool_end`, `done`

Ferramentas disponíveis (Rust):
- `read_file` — lê arquivo
- `write_file` — cria/sobrescreve arquivo  
- `edit_file` — edição cirúrgica (busca/substituição)
- `bash` — executa shell
- `glob` — busca arquivos por padrão
- `grep` — pesquisa conteúdo
- `list_dir` — lista diretório
- `docker_run` / `docker_list` / `docker_images` — integração Docker

### O que o Kairos tem
`src/actions/` — `WriteFileAction`, `ReadFileAction`, `DeleteFileAction`, `RunCommandAction` mas não integradas ao chat.  
`src/core/guardrails/command-validator.ts` — validação de comandos.

### Gap
- [ ] `edit_file` (busca e substituição cirúrgica, equivale ao `replace_string_in_file` do agente)
- [ ] `glob` (busca por padrão de arquivo)
- [ ] `grep` (busca de texto em arquivos)
- [ ] `list_dir` como ferramenta no loop do agente
- [ ] `docker_run`, `docker_list`, `docker_images`
- [ ] Chat com ferramentas habilitadas (agente que usa tools durante conversa normal)

---

## 5. MCP Client com Persistência

### O que o Cowork tem
`src-tauri/src/mcp/` — cliente MCP **completo**:
- `config.rs` — configuração de servers MCP com OAuth
- `client.rs` — conexão HTTP/streamable HTTP
- `http_client.rs` — cliente HTTP para MCP
- `storage.rs` — persistência de configs no disco
- `types.rs` — `MCPServerConfig`, `MCPTool`, `MCPServerStatus`, `MCPToolCall`, `MCPToolResult`

Frontend `src/components/MCPSettings.tsx`:
- Adicionar/remover servidores MCP por URL
- Conectar/desconectar
- Ver status e ferramentas disponíveis
- OAuth client id/secret

### O que o Kairos tem
`src/interfaces/api/` — servidor MCP (Kairos **é** um server MCP), não um **client**.

### Gap
- [ ] MCP **client** (conectar a outros servidores MCP externos)
- [ ] UI de configuração de servidores MCP (`MCPSettings`)
- [ ] OAuth para servidores MCP
- [ ] Injeção de ferramentas MCP no loop do agente

---

## 6. Skills System

### O que o Cowork tem
`src-tauri/src/skills/mod.rs`:
- Diretório `~/.kuse-cowork/skills/` com SKILL.md por skill
- Skills padrão bundled: `pdf`, `docx`, `xlsx`, `pptx`
- Parsing de YAML frontmatter (`name`, `description`)
- `get_available_skills()` — lista skills disponíveis
- Auto-instalação na primeira execução
- Injeção automática no system prompt do agente
- Docker auto-monta `/skills` como read-only

Frontend `src/components/SkillsList.tsx`:
- Lista de skills disponíveis
- Status de instalação

`packages/skills/` já existe no repo com guia de NotebookLM.

### O que o Kairos tem
`packages/skills/readme.md` — apenas documentação.  
Kairos não tem integração de skills no loop de agente.

### Gap
- [ ] Scan de diretório de skills com YAML frontmatter
- [ ] Auto-injeção de skills no system prompt
- [ ] `SkillsList` UI
- [ ] Skills padrão bundled (pdf, docx, xlsx, pptx)

---

## 7. Model Selector UI

### O que o Cowork tem
`src/components/ModelSelector.tsx` + `src/components/Settings.tsx`:
- Dropdown agrupado por `auto / recommended / other`
- Troca de chave de API por provider automaticamente ao mudar modelo
- Campos: base URL, max tokens, temperatura, chaves por provider
- `testConnection` inline
- Suporte a organização/projeto OpenAI

### O que o Kairos tem
`src/interfaces/dashboard/agents/ModelRegistry.ts` — registro de modelos internos.  
Kairos usa o VS Code LM API — o usuário não seleciona modelo manualmente.

### Gap (para o modo web/standalone do Kairos)
- [ ] `ModelSelector` com grupos
- [ ] Troca de API key por provider
- [ ] Settings UI com campos por provider
- [ ] Suporte a `openai_organization` / `openai_project`

---

## 8. Sidebar com Listagem de Conversas

### O que o Cowork tem
`src/components/Sidebar.tsx` + `src/components/TaskSidebar.tsx`:
- Lista de conversas com título e data
- Criar / deletar conversa
- Selecionar conversa ativa
- Separador Chat / Tasks

### O que o Kairos tem
`src/interfaces/dashboard/views/SidebarProviders.ts` — sidebar VS Code com chat único.

### Gap (para versão web/standalone)
- [ ] Listagem de conversas com CRUD
- [ ] Sidebar de tasks

---

## 9. PDF / Documento Extraction

### O que o Cowork tem
`extract_pdf.cjs`, `extract_pdf.js` — extração de texto de PDFs  
`packages/skills/pdf`, `docx`, `xlsx`, `pptx` — skills de processamento de documentos  
`dependencies: { "pdf-parse": "^2.4.5" }`

### O que o Kairos tem
Nenhuma capacidade de extração de documentos.

### Gap
- [ ] Extração de texto de PDF
- [ ] Skills para docx / xlsx / pptx
- [ ] Tool `read_pdf` no loop do agente

---

## Resumo: O que migrar

| Área | Prioridade | Esforço |
|---|---|---|
| Multi-provider AI client | Alta | Médio |
| Task system + agente multi-turno | Alta | Alto |
| Ferramentas: edit_file, glob, grep, docker | Alta | Médio |
| Chat com ferramentas habilitadas | Alta | Médio |
| MCP client (conectar a servers externos) | Alta | Alto |
| Skills system | Média | Médio |
| Conversation CRUD com persistência | Média | Médio |
| Model Selector UI | Média | Baixo |
| PDF / documento extraction | Baixa | Baixo |

---

## O que o Cowork NÃO tem (vantagens do Kairos)

- Integração nativa VS Code (chat panel, comandos, webview)
- LLM Server compatível com Ollama (expõe modelos do Copilot)
- Sistema de memória persistente (`MemoryManager`, `VectorStore`)
- `Recall` / `ContextBuilder` para busca semântica de contexto
- `Sleep` / consolidação noturna de logs
- `Policies` / `ApprovalFlow` / `Guardrails`
- `EventBus` / `FileWatcher` / observers
- Pipeline de CI/CD, deployment, Docker
- MCP **server** (Kairos como ferramenta para outros agentes)
