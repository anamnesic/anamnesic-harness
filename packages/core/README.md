# packages/core

Pacote `@kairos/core` — runtime central do Kairos que reúne a lógica de agentes reutilizável compartilhada com os demais pacotes do monorepo. Contém o pipeline de query, gerenciamento de memória, tarefas, ferramentas, serviços e utilitários gerais. Depende apenas de `@kairos/vault` e expõe seus módulos via exports de ESM.

## Estrutura de `src/`

| Diretório / Arquivo | Descrição |
|---|---|
| `agent/` | Componentes React do agente (tela principal, ações, interfaces, telas, políticas) |
| `assistant/` | Histórico de conversas e histórico de sessão (`history.ts`, `sessionHistory.ts`) |
| `coordinator/` | Modo coordenador para orquestração de múltiplos agentes (`coordinatorMode.ts`) |
| `core/` | Sub-pacote interno com configuração, scripts e testes próprios |
| `memdir/` | Sistema de diretório de memória: tipos, caminhos, varredura, prompts de equipe |
| `memory/` | Sub-pacote de persistência de memória com `src/` próprio |
| `query/` | Motor de query (`QueryEngine.ts`, `query.ts`), orçamento de tokens e stop-hooks |
| `services/` | Serviços de suporte: analytics, MCP, OAuth, plugins, rastreamento de custo, voz, LSP, sincronização de configurações remotas |
| `tasks/` | Tipos e implementações de tarefas: `LocalAgentTask`, `RemoteAgentTask`, `DreamTask`, `LocalShellTask`, entre outros |
| `tools/` | Implementação de todas as ferramentas disponíveis ao agente (Bash, FileRead, FileEdit, WebSearch, MCP, etc.) e utilitários compartilhados |
| `utils/` | Utilitários gerais: autenticação, configuração, git, sessão, shell, telemetria, worktree e centenas de helpers reutilizáveis |
| `BRAIN_DOCUMENTATION.md` | Documentação interna da memória persistente (brain) do agente |
