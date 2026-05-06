
# TODO — Kairos Full System Implementation

**Status: ✅ COMPLETED (v1.0.0)**

---

## 1. Forge Core (TypeScript/Node.js)

- [x] Estruturar monorepo pnpm: `/core`, `/tui`, `/protocol`, `/plugins`, `/apps`
- [x] Implementar runtime de agentes (execução, fallback, limites, seleção de modelo)
- [x] Orquestração de ferramentas (tool registry, execução, permissões, streaming)
- [x] Sistema de sessões: JSONL append-only, SQLite metadata, LanceDB embeddings, auto-titling, context window tracking
- [x] Sistema de configuração: merge profundo, hot reload, fallback, recovery
- [x] Abstração de provedores LLM (OpenAI, Anthropic, Gemini, Groq, DeepSeek, Ollama, LM Studio, extensível)
- [x] Gateway de mensagens multi-canal (plugin system: Discord, Telegram, Slack, WhatsApp, Matrix, Signal, iMessage, IRC, Teams, etc.)
- [x] Sistema de permissões: modos interativo, owner-only, always-allow, yolo; aprovação granular
- [x] Ferramentas obrigatórias: bash (sandboxed, blocklist, timeout, output cap), file read/write/edit, multi-file patch, glob/grep/ls, HTTP fetch, git, LSP diagnostics, browser automation, cron, image generation, session spawning
- [x] Execução de ferramentas: pausa, checagem de permissão, execução, streaming
- [x] Plugin system: manifest-driven, npm/local, auto-discovery, safe failure
- [x] API WebSocket (primário): streaming tokens, eventos de ferramenta, updates de sessão, presença
- [x] API HTTP (secundário): RPC, config, health, webhooks
- [x] Integração LSP: spawn servers, watch FS, expose diagnostics, fallback
- [x] Tratamento de falhas: desconexão canal, timeout ferramenta, sessão ausente, corrupção config, falha plugin
- [x] CLI: `kairos core`, `kairos doctor`, `kairos plugins`, `kairos channels`, `kairos sessions`

## 2. Forge TUI (Go)

- [x] Implementar cliente TUI com Bubble Tea, Lipgloss, Glamour, Cobra, Viper, SQLite opcional
- [x] Modos: conectado (WebSocket com Core), standalone (execução local)
- [x] Layout: header (repo, dir, agente, modelo), sidebar (sessões), painel principal (mensagens, markdown), painel inferior (editor multi-linha), overlays (model picker, agent switcher, palette, permissões, logs, tema)
- [x] Temas: kairos, Catppuccin, Dracula, Gruvbox, TokyoNight, Monokai (light/dark)
- [x] Keybindings: Ctrl+C (quit), Ctrl+O (model), Ctrl+K (palette), Ctrl+N (nova sessão), Ctrl+X (cancelar agente), Ctrl+L (logs), Ctrl+S (send), Ctrl+E (editor externo), i (focus), Esc (blur), ? (help)
- [x] Features: streaming, feedback inline de ferramentas, permissões interativas, troca de sessão, palette de comandos customizados
- [x] Comandos customizados: carregar de `~/.config/kairos/commands/` e `.project/.kairos/commands/` (Markdown com placeholders)
- [x] Modo não-interativo: `kairos run -p "prompt"` (sem TUI, sem permissões, output texto/JSON)

## 3. Integração e Compartilhamento

- [x] Compartilhar sessões, agentes e ferramentas entre Core e TUI via WebSocket
- [x] Fallback para standalone se Core indisponível

## 4. Segurança

- [x] Fluxo de pareamento para novos usuários
- [x] Allowlist por canal
- [x] Gating por menção em grupo
- [x] Sandbox para ferramentas inseguras (Docker/SSH)

## 5. Requisitos de Entrega

- [x] Core executa sem crash: `kairos core`
- [x] TUI conecta e funciona: `kairos tui`
- [x] Streaming de respostas funcional
- [x] Tool calls com fluxo de permissão
- [x] Sessões persistem e recarregam
- [x] Pelo menos um plugin de canal funcional
- [x] Modo não-interativo: `kairos run -p "say hello"`
- [x] Verificação end-to-end (não só compilação)

---

# Observações

- Implementar código funcional, não apenas mockups
- Separação clara de responsabilidades
- Plugins e canais devem ser extensíveis
- Evitar dead code e integrações incompletas
