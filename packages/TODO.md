
# TODO — Kairos Full System Implementation

---

## 1. Forge Core (TypeScript/Node.js)

- [ ] Estruturar monorepo pnpm: `/core`, `/tui`, `/protocol`, `/plugins`, `/apps`
- [ ] Implementar runtime de agentes (execução, fallback, limites, seleção de modelo)
- [ ] Orquestração de ferramentas (tool registry, execução, permissões, streaming)
- [ ] Sistema de sessões: JSONL append-only, SQLite metadata, LanceDB embeddings, auto-titling, context window tracking
- [ ] Sistema de configuração: merge profundo, hot reload, fallback, recovery
- [ ] Abstração de provedores LLM (OpenAI, Anthropic, Gemini, Groq, DeepSeek, Ollama, LM Studio, extensível)
- [ ] Gateway de mensagens multi-canal (plugin system: Discord, Telegram, Slack, WhatsApp, Matrix, Signal, iMessage, IRC, Teams, etc.)
- [ ] Sistema de permissões: modos interativo, owner-only, always-allow, yolo; aprovação granular
- [ ] Ferramentas obrigatórias: bash (sandboxed, blocklist, timeout, output cap), file read/write/edit, multi-file patch, glob/grep/ls, HTTP fetch, git, LSP diagnostics, browser automation, cron, image generation, session spawning
- [ ] Execução de ferramentas: pausa, checagem de permissão, execução, streaming
- [ ] Plugin system: manifest-driven, npm/local, auto-discovery, safe failure
- [ ] API WebSocket (primário): streaming tokens, eventos de ferramenta, updates de sessão, presença
- [ ] API HTTP (secundário): RPC, config, health, webhooks
- [ ] Integração LSP: spawn servers, watch FS, expose diagnostics, fallback
- [ ] Tratamento de falhas: desconexão canal, timeout ferramenta, sessão ausente, corrupção config, falha plugin
- [ ] CLI: `kairos core`, `kairos doctor`, `kairos plugins`, `kairos channels`, `kairos sessions`

## 2. Forge TUI (Go)

- [ ] Implementar cliente TUI com Bubble Tea, Lipgloss, Glamour, Cobra, Viper, SQLite opcional
- [ ] Modos: conectado (WebSocket com Core), standalone (execução local)
- [ ] Layout: header (repo, dir, agente, modelo), sidebar (sessões), painel principal (mensagens, markdown), painel inferior (editor multi-linha), overlays (model picker, agent switcher, palette, permissões, logs, tema)
- [ ] Temas: kairos, Catppuccin, Dracula, Gruvbox, TokyoNight, Monokai (light/dark)
- [ ] Keybindings: Ctrl+C (quit), Ctrl+O (model), Ctrl+K (palette), Ctrl+N (nova sessão), Ctrl+X (cancelar agente), Ctrl+L (logs), Ctrl+S (send), Ctrl+E (editor externo), i (focus), Esc (blur), ? (help)
- [ ] Features: streaming, feedback inline de ferramentas, permissões interativas, troca de sessão, palette de comandos customizados
- [ ] Comandos customizados: carregar de `~/.config/kairos/commands/` e `.project/.kairos/commands/` (Markdown com placeholders)
- [ ] Modo não-interativo: `kairos run -p "prompt"` (sem TUI, sem permissões, output texto/JSON)

## 3. Integração e Compartilhamento

- [ ] Compartilhar sessões, agentes e ferramentas entre Core e TUI via WebSocket
- [ ] Fallback para standalone se Core indisponível

## 4. Segurança

- [ ] Fluxo de pareamento para novos usuários
- [ ] Allowlist por canal
- [ ] Gating por menção em grupo
- [ ] Sandbox para ferramentas inseguras (Docker/SSH)

## 5. Requisitos de Entrega

- [ ] Core executa sem crash: `kairos core`
- [ ] TUI conecta e funciona: `kairos tui`
- [ ] Streaming de respostas funcional
- [ ] Tool calls com fluxo de permissão
- [ ] Sessões persistem e recarregam
- [ ] Pelo menos um plugin de canal funcional
- [ ] Modo não-interativo: `kairos run -p "say hello"`
- [ ] Verificação end-to-end (não só compilação)

---

# Observações

- Implementar código funcional, não apenas mockups
- Separação clara de responsabilidades
- Plugins e canais devem ser extensíveis
- Evitar dead code e integrações incompletas
