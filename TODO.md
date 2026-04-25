# TODO — Kairos Migration

> Lógica/backend já migrada. Itens abaixo são UI e integrações de loop.

---

## Alta prioridade

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

## Próximos passos

- [ ] Registrar os novos painéis na `src/interfaces/dashboard/extension.ts` (comandos `Kairos.openSettings`, `Kairos.openMcpSettings`, `Kairos.openSkills`)
- [ ] Registrar `ConversationsSidebarProvider` como viewType em `package.json` da extensão VS Code
