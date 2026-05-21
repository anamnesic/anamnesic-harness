# AGENTS.md

This repo treats code + docs/ as the source of truth. If you are unsure, start with docs/README.md.

## Entry points
- docs/README.md - documentation index and where to look next.
- README.md - project overview and provider list.
- INSTALL.md - install and verify steps.
- KAIROS.md - agent guidance and command hints.
- KAIROS_FEATURES_STATUS.md - feature gates and build flags.
- TODOCOPILOT.md - porting decisions and history.
- chronos.md - Chronos orchestration details.
- BUILD_REPORT.md - build notes and known issues.

## Key areas
- source/src - main CLI runtime (extracted upstream source).
- providers/* - provider plugins (each self-contained).
- packages/vscode - VS Code extension.
- packages/nextjs - Next.js UI (optional).
- dist/ - generated bundle output.
- .kairos/agents - local agent prompt inventory.

## Ops
- docs/observability.md - logs, metrics, traces.
- docs/worktrees.md - isolated worktree sessions.
- docs/architecture.md - layout and boundary rules.

## Índice de READMEs por Pasta

Cada pasta significativa do projeto tem um `README.md` explicando seu conteúdo. Este índice cobre as áreas versionadas do repo e evita artefatos locais ou gerados como `node_modules/`, `.next/` e `logs/`.

### Raiz do Repositório
| Pasta | README | O que contem |
|---|---|---|
| `.agents/` | [.agents/README.md](.agents/README.md) | Inventario local de skills e agentes usados por automacoes e fluxos de manutencao do repositorio. |
| `.github/` | [.github/README.md](.github/README.md) | Configuracao do GitHub: workflows, actions compostas, templates, prompts e regras de manutencao. |
| `.husky/` | [.husky/README.md](.husky/README.md) | Hooks Git locais que protegem commits e pushes durante o desenvolvimento. |
| `.kairos/` | [.kairos/README.md](.kairos/README.md) | Configuracao local do Kairos, comandos, skills, temas, ferramentas e glossarios internos. |
| `.pi/` | [.pi/README.md](.pi/README.md) | Extensoes e prompts experimentais usados por fluxos internos de automacao. |
| `.zed/` | [.zed/README.md](.zed/README.md) | Configuracoes do editor Zed para trabalhar neste repositorio. |
| `app/` | [app/README.md](app/README.md) | Rotas HTTP auxiliares e endpoints de API do app. |
| `apps/` | [apps/README.md](apps/README.md) | O diretório `apps/` contém as aplicações cliente nativas do projeto Kairos. Cada subdiretório representa uma plataforma-alvo distinta ou um kit compartilhado entre plataformas, complementando a interface web e a CLI do projeto. |
| `assets/` | [assets/README.md](assets/README.md) | O diretório `assets/` contém os assets visuais do projeto Kairos, usados em instaladores, documentação e na interface. |
| `data/` | [data/README.md](data/README.md) | Dados locais, fixtures e insumos usados por testes, importacoes ou ferramentas. |
| `docs/` | [docs/README.md](docs/README.md) | Diretório de documentação principal do Kairos. Contém documentos de arquitetura, guias operacionais, referências técnicas, relatórios de análise e subdiretórios de documentação especializada por domínio. É o ponto de partida para entender o projeto, suas decisões de design e seu estado atual. |
| `extensions/` | [extensions/README.md](extensions/README.md) | O diretório `extensions/` contém mais de 120 extensões do Kairos - providers de IA, canais de mensagens e ferramentas utilitárias. Cada subdiretório é um plugin auto-contido que pode ser carregado de forma independente pelo runtime do Kairos. Extensões internas de QA são privadas e não são publicadas no registro público. |
| `github/` | [github/README.md](github/README.md) | A GitHub Action that integrates [kairos](https://kairos.ai) directly into your GitHub workflow. |
| `infra/` | [infra/README.md](infra/README.md) | Contém os arquivos de infraestrutura e deploy do Kairos. Aqui ficam as configurações das plataformas de hospedagem (Fly.io, Render) e das stacks AWS via SST (Ion/CDK), além do gerenciamento de secrets de ambiente. |
| `nix/` | [nix/README.md](nix/README.md) | Contém os arquivos Nix responsáveis pelos builds reproduzíveis do Kairos. |
| `packages/` | [packages/README.md](packages/README.md) | O diretório `packages/` contém todos os pacotes internos do monorepo Kairos. Cada subdiretório é um pacote independente com sua própria responsabilidade, podendo ser publicado separadamente ou consumido pelos demais pacotes do monorepo via referências locais. |
| `patches/` | [patches/README.md](patches/README.md) | Patches locais aplicados sobre dependencias ou artefatos de terceiros. |
| `scripts/` | [scripts/README.md](scripts/README.md) | Contém scripts de automação para release, manutenção e geração de artefatos do monorepo kairos. Os scripts são escritos em TypeScript (executados via Bun) e JavaScript, e são invocados principalmente pelo pipeline de CI/CD e pelos mantenedores do projeto. |
| `sdks/` | [sdks/README.md](sdks/README.md) | O diretório `sdks/` contém SDKs do Kairos para plataformas de terceiros - integrações com editores, IDEs e superfícies externas. Cada subdiretório é um SDK independente com seu próprio build e publicação. |
| `src/` | [src/README.md](src/README.md) | O diretório `src/` contém o código-fonte do backend TypeScript do Kairos: servidor de API REST, interfaces de entrada (CLI, extensão, dashboard), gerenciamento de memória persistente e módulos de infraestrutura. |
| `tests/` | [tests/README.md](tests/README.md) | Testes de integracao, fixtures e cenarios de validacao de alto nivel. |

### Aplicações (`apps/`)
| Pasta | README | O que contem |
|---|---|---|
| `apps/android/` | [apps/android/README.md](apps/android/README.md) | Status: **extremely alpha**. The app is actively being rebuilt from the ground up. |
| `apps/ios/` | [apps/ios/README.md](apps/ios/README.md) | This iPhone app is super-alpha and internal-use only. It connects to an kairos Gateway as a `role: node`. |
| `apps/shared/` | [apps/shared/README.md](apps/shared/README.md) | Contém o kit Swift compartilhado entre as aplicações iOS e macOS do kairos. Todo o código aqui é agnóstico à plataforma de destino final (iOS ≥ 18, macOS ≥ 15) e é consumido como dependência local pelos apps nativos. |

### Pacotes (`packages/`)
| Pasta | README | O que contem |
|---|---|---|
| `packages/brain/` | [packages/brain/README.md](packages/brain/README.md) | Documentacao e codigo do modulo Brain. |
| `packages/cli/` | [packages/cli/README.md](packages/cli/README.md) | Kairos CLI / Terminal - commands, ink, tui, screens, entrypoints. |
| `packages/contract/` | [packages/contract/README.md](packages/contract/README.md) | Contratos internos de empacotamento e validacao de plugins. |
| `packages/core/` | [packages/core/README.md](packages/core/README.md) | Pacote `@kairos/core` - runtime central do Kairos que reúne a lógica de agentes reutilizável compartilhada com os demais pacotes do monorepo. Contém o pipeline de query, gerenciamento de memória, tarefas, ferramentas, serviços e utilitários gerais. Depende apenas de `@kairos/vault` e expõe seus módulos via exports de ESM. |
| `packages/devtools/` | [packages/devtools/README.md](packages/devtools/README.md) | Kairos dev tooling - scripts, containers, vendor, patches, qa, security, test. |
| `packages/editor/` | [packages/editor/README.md](packages/editor/README.md) | Pacote de integrações de editor do Kairos (`@kairos/editor`). Fornece as camadas de comunicação, atalhos de teclado, suporte a Vim, bindings nativos e extensões de terceiros que sustentam a experiência de edição dentro do VS Code e de outras superfícies do projeto. O build de produção é gerado via `esbuild.vscode.js`, empacotando a extensão como módulo CommonJS compatível com Node 18. |
| `packages/infra/` | [packages/infra/README.md](packages/infra/README.md) | Kairos infrastructure - protocol, types, constants, schemas, proxy, server, remote. |
| `packages/integrations/` | [packages/integrations/README.md](packages/integrations/README.md) | Kairos external integrations - skills, slack, function, voice, Swabble wake-word. |
| `packages/kairoscode/` | [packages/kairoscode/README.md](packages/kairoscode/README.md) | Pacote principal do runtime Kairos (`@kairos/kairoscode`). Concentra a maior parte da lógica de negócio da plataforma, incluindo a CLI, o servidor HTTP, a interface TUI (baseada em SolidJS/opentui), o pipeline de execução de agentes, a gestão de provedores de LLM e a camada de armazenamento persistente via SQLite/Drizzle. Utiliza **Bun** como runtime de execução. |
| `packages/openapi/` | [packages/openapi/README.md](packages/openapi/README.md) | Esquemas e artefatos OpenAPI usados pela plataforma. |
| `packages/plugins/` | [packages/plugins/README.md](packages/plugins/README.md) | Pacote interno plugins do monorepo Kairos. |
| `packages/registry/` | [packages/registry/README.md](packages/registry/README.md) | Pacote interno registry do monorepo Kairos. |
| `packages/sdk/` | [packages/sdk/README.md](packages/sdk/README.md) | SDK público do Kairos (`@kairos/sdk`). Exporta a API de alto nível para integradores externos que precisam criar runs, gerenciar sessões e consumir eventos em tempo real através do Kairos Gateway. O bundle final é gerado em `dist/` como módulo ESM com declarações TypeScript. |
| `packages/state/` | [packages/state/README.md](packages/state/README.md) | Kairos UI state and internals - state, context, hooks, components, bootstrap, buddy. |
| `packages/ui/` | [packages/ui/README.md](packages/ui/README.md) | Pacote interno ui do monorepo Kairos. |
| `packages/vault/` | [packages/vault/README.md](packages/vault/README.md) | Encrypted vault for sensitive runtime data. |
| `packages/web/` | [packages/web/README.md](packages/web/README.md) | [![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build) |

### Extensões (`extensions/`)
| Pasta | README | O que contem |
|---|---|---|
| `extensions/acpx/` | [extensions/acpx/README.md](extensions/acpx/README.md) | kairos ACP runtime backend. |
| `extensions/active-memory/` | [extensions/active-memory/README.md](extensions/active-memory/README.md) | Runs a bounded blocking memory sub-agent before eligible conversational replies and injects relevant memory into prompt context. |
| `extensions/alibaba/` | [extensions/alibaba/README.md](extensions/alibaba/README.md) | kairos Alibaba Model Studio video provider plugin. |
| `extensions/amazon-bedrock/` | [extensions/amazon-bedrock/README.md](extensions/amazon-bedrock/README.md) | kairos Amazon Bedrock provider plugin. |
| `extensions/amazon-bedrock-mantle/` | [extensions/amazon-bedrock-mantle/README.md](extensions/amazon-bedrock-mantle/README.md) | kairos Amazon Bedrock Mantle (OpenAI-compatible) provider plugin. |
| `extensions/anthropic/` | [extensions/anthropic/README.md](extensions/anthropic/README.md) | kairos Anthropic provider plugin. |
| `extensions/anthropic-vertex/` | [extensions/anthropic-vertex/README.md](extensions/anthropic-vertex/README.md) | kairos Anthropic Vertex provider plugin. |
| `extensions/arcee/` | [extensions/arcee/README.md](extensions/arcee/README.md) | kairos Arcee provider plugin. |
| `extensions/azure-speech/` | [extensions/azure-speech/README.md](extensions/azure-speech/README.md) | kairos Azure Speech plugin. |
| `extensions/bluebubbles/` | [extensions/bluebubbles/README.md](extensions/bluebubbles/README.md) | This package contains the **BlueBubbles external channel plugin** for kairos. |
| `extensions/bonjour/` | [extensions/bonjour/README.md](extensions/bonjour/README.md) | kairos Bonjour/mDNS gateway discovery. |
| `extensions/brave/` | [extensions/brave/README.md](extensions/brave/README.md) | kairos Brave plugin. |
| `extensions/browser/` | [extensions/browser/README.md](extensions/browser/README.md) | kairos browser tool plugin. |
| `extensions/byteplus/` | [extensions/byteplus/README.md](extensions/byteplus/README.md) | kairos BytePlus provider plugin. |
| `extensions/cerebras/` | [extensions/cerebras/README.md](extensions/cerebras/README.md) | kairos Cerebras provider plugin. |
| `extensions/chutes/` | [extensions/chutes/README.md](extensions/chutes/README.md) | kairos Chutes.ai provider plugin. |
| `extensions/cloudflare-ai-gateway/` | [extensions/cloudflare-ai-gateway/README.md](extensions/cloudflare-ai-gateway/README.md) | kairos Cloudflare AI Gateway provider plugin. |
| `extensions/codex/` | [extensions/codex/README.md](extensions/codex/README.md) | kairos Codex harness and model provider plugin. |
| `extensions/comfy/` | [extensions/comfy/README.md](extensions/comfy/README.md) | kairos ComfyUI provider plugin. |
| `extensions/copilot-proxy/` | [extensions/copilot-proxy/README.md](extensions/copilot-proxy/README.md) | Provider plugin for the **Copilot Proxy** VS Code extension. |
| `extensions/deepgram/` | [extensions/deepgram/README.md](extensions/deepgram/README.md) | kairos Deepgram media-understanding provider. |
| `extensions/deepinfra/` | [extensions/deepinfra/README.md](extensions/deepinfra/README.md) | kairos DeepInfra provider plugin. |
| `extensions/deepseek/` | [extensions/deepseek/README.md](extensions/deepseek/README.md) | kairos DeepSeek provider plugin. |
| `extensions/device-pair/` | [extensions/device-pair/README.md](extensions/device-pair/README.md) | Generate setup codes and approve device pairing requests. |
| `extensions/diagnostics-otel/` | [extensions/diagnostics-otel/README.md](extensions/diagnostics-otel/README.md) | kairos diagnostics OpenTelemetry exporter. |
| `extensions/diagnostics-prometheus/` | [extensions/diagnostics-prometheus/README.md](extensions/diagnostics-prometheus/README.md) | kairos diagnostics Prometheus exporter. |
| `extensions/diffs/` | [extensions/diffs/README.md](extensions/diffs/README.md) | Read-only diff viewer plugin for **kairos** agents. |
| `extensions/discord/` | [extensions/discord/README.md](extensions/discord/README.md) | kairos Discord channel plugin. |
| `extensions/document-extract/` | [extensions/document-extract/README.md](extensions/document-extract/README.md) | kairos local document extraction plugin. |
| `extensions/duckduckgo/` | [extensions/duckduckgo/README.md](extensions/duckduckgo/README.md) | kairos DuckDuckGo plugin. |
| `extensions/elevenlabs/` | [extensions/elevenlabs/README.md](extensions/elevenlabs/README.md) | kairos ElevenLabs speech plugin. |
| `extensions/exa/` | [extensions/exa/README.md](extensions/exa/README.md) | kairos Exa plugin. |
| `extensions/fal/` | [extensions/fal/README.md](extensions/fal/README.md) | kairos fal provider plugin. |
| `extensions/feishu/` | [extensions/feishu/README.md](extensions/feishu/README.md) | kairos Feishu/Lark channel plugin (community maintained by @m1heng). |
| `extensions/file-transfer/` | [extensions/file-transfer/README.md](extensions/file-transfer/README.md) | kairos file transfer plugin (file_fetch, dir_list, dir_fetch, file_write). |
| `extensions/firecrawl/` | [extensions/firecrawl/README.md](extensions/firecrawl/README.md) | kairos Firecrawl plugin. |
| `extensions/fireworks/` | [extensions/fireworks/README.md](extensions/fireworks/README.md) | kairos Fireworks provider plugin. |
| `extensions/github-copilot/` | [extensions/github-copilot/README.md](extensions/github-copilot/README.md) | kairos GitHub Copilot provider plugin. |
| `extensions/google/` | [extensions/google/README.md](extensions/google/README.md) | kairos Google plugin. |
| `extensions/google-meet/` | [extensions/google-meet/README.md](extensions/google-meet/README.md) | kairos Google Meet participant plugin. |
| `extensions/googlechat/` | [extensions/googlechat/README.md](extensions/googlechat/README.md) | kairos Google Chat channel plugin. |
| `extensions/gradium/` | [extensions/gradium/README.md](extensions/gradium/README.md) | kairos Gradium speech plugin. |
| `extensions/groq/` | [extensions/groq/README.md](extensions/groq/README.md) | kairos Groq media-understanding provider. |
| `extensions/huggingface/` | [extensions/huggingface/README.md](extensions/huggingface/README.md) | kairos Hugging Face provider plugin. |
| `extensions/image-generation-core/` | [extensions/image-generation-core/README.md](extensions/image-generation-core/README.md) | kairos image generation runtime package. |
| `extensions/imessage/` | [extensions/imessage/README.md](extensions/imessage/README.md) | kairos iMessage channel plugin. |
| `extensions/inworld/` | [extensions/inworld/README.md](extensions/inworld/README.md) | kairos Inworld speech plugin. |
| `extensions/irc/` | [extensions/irc/README.md](extensions/irc/README.md) | kairos IRC channel plugin. |
| `extensions/kairos/` | [extensions/kairos/README.md](extensions/kairos/README.md) | kairos kairos Zen provider plugin. |
| `extensions/kairos-go/` | [extensions/kairos-go/README.md](extensions/kairos-go/README.md) | kairos kairos Go provider plugin. |
| `extensions/kilocode/` | [extensions/kilocode/README.md](extensions/kilocode/README.md) | kairos Kilo Gateway provider plugin. |
| `extensions/kimi-coding/` | [extensions/kimi-coding/README.md](extensions/kimi-coding/README.md) | kairos Kimi provider plugin. |
| `extensions/line/` | [extensions/line/README.md](extensions/line/README.md) | kairos LINE channel plugin. |
| `extensions/litellm/` | [extensions/litellm/README.md](extensions/litellm/README.md) | kairos LiteLLM provider plugin. |
| `extensions/llm-task/` | [extensions/llm-task/README.md](extensions/llm-task/README.md) | Adds an **optional** agent tool `llm-task` for running **JSON-only** LLM tasks |
| `extensions/lmstudio/` | [extensions/lmstudio/README.md](extensions/lmstudio/README.md) | Bundled provider plugin for LM Studio discovery, auto-load, and setup. |
| `extensions/lobster/` | [extensions/lobster/README.md](extensions/lobster/README.md) | Adds the `lobster` agent tool as an **optional** plugin tool. |
| `extensions/matrix/` | [extensions/matrix/README.md](extensions/matrix/README.md) | kairos Matrix channel plugin. |
| `extensions/mattermost/` | [extensions/mattermost/README.md](extensions/mattermost/README.md) | kairos Mattermost channel plugin. |
| `extensions/media-understanding-core/` | [extensions/media-understanding-core/README.md](extensions/media-understanding-core/README.md) | kairos media understanding runtime package. |
| `extensions/memory-core/` | [extensions/memory-core/README.md](extensions/memory-core/README.md) | kairos core memory search plugin. |
| `extensions/memory-lancedb/` | [extensions/memory-lancedb/README.md](extensions/memory-lancedb/README.md) | kairos LanceDB-backed long-term memory plugin with auto-recall/capture. |
| `extensions/memory-wiki/` | [extensions/memory-wiki/README.md](extensions/memory-wiki/README.md) | Persistent wiki compiler and Obsidian-friendly knowledge vault for **kairos**. |
| `extensions/microsoft/` | [extensions/microsoft/README.md](extensions/microsoft/README.md) | kairos Microsoft speech plugin. |
| `extensions/microsoft-foundry/` | [extensions/microsoft-foundry/README.md](extensions/microsoft-foundry/README.md) | kairos Microsoft Foundry provider plugin. |
| `extensions/migrate-claude/` | [extensions/migrate-claude/README.md](extensions/migrate-claude/README.md) | kairos to kairos migration provider. |
| `extensions/migrate-hermes/` | [extensions/migrate-hermes/README.md](extensions/migrate-hermes/README.md) | Hermes to kairos migration provider. |
| `extensions/minimax/` | [extensions/minimax/README.md](extensions/minimax/README.md) | Bundled MiniMax plugin for both: |
| `extensions/mistral/` | [extensions/mistral/README.md](extensions/mistral/README.md) | kairos Mistral provider plugin. |
| `extensions/moonshot/` | [extensions/moonshot/README.md](extensions/moonshot/README.md) | kairos Moonshot provider plugin. |
| `extensions/msteams/` | [extensions/msteams/README.md](extensions/msteams/README.md) | kairos Microsoft Teams channel plugin. |
| `extensions/nextcloud-talk/` | [extensions/nextcloud-talk/README.md](extensions/nextcloud-talk/README.md) | kairos Nextcloud Talk channel plugin. |
| `extensions/nostr/` | [extensions/nostr/README.md](extensions/nostr/README.md) | Nostr DM channel plugin for kairos using NIP-04 encrypted direct messages. |
| `extensions/nvidia/` | [extensions/nvidia/README.md](extensions/nvidia/README.md) | kairos NVIDIA provider plugin. |
| `extensions/ollama/` | [extensions/ollama/README.md](extensions/ollama/README.md) | Bundled provider plugin for Ollama discovery and setup. |
| `extensions/open-prose/` | [extensions/open-prose/README.md](extensions/open-prose/README.md) | Adds the OpenProse skill pack and `/prose` slash command. |
| `extensions/openai/` | [extensions/openai/README.md](extensions/openai/README.md) | kairos OpenAI provider plugins. |
| `extensions/openrouter/` | [extensions/openrouter/README.md](extensions/openrouter/README.md) | kairos OpenRouter provider plugin. |
| `extensions/openshell/` | [extensions/openshell/README.md](extensions/openshell/README.md) | kairos OpenShell sandbox backend. |
| `extensions/perplexity/` | [extensions/perplexity/README.md](extensions/perplexity/README.md) | kairos Perplexity plugin. |
| `extensions/phone-control/` | [extensions/phone-control/README.md](extensions/phone-control/README.md) | Arm/disarm high-risk phone node commands (camera/screen/writes) with an optional auto-expiry. |
| `extensions/qa-channel/` | [extensions/qa-channel/README.md](extensions/qa-channel/README.md) | kairos QA synthetic channel plugin. |
| `extensions/qa-lab/` | [extensions/qa-lab/README.md](extensions/qa-lab/README.md) | kairos QA lab plugin with private debugger UI and scenario runner. |
| `extensions/qa-matrix/` | [extensions/qa-matrix/README.md](extensions/qa-matrix/README.md) | kairos Matrix QA runner plugin. |
| `extensions/qianfan/` | [extensions/qianfan/README.md](extensions/qianfan/README.md) | kairos Qianfan provider plugin. |
| `extensions/qqbot/` | [extensions/qqbot/README.md](extensions/qqbot/README.md) | kairos QQ Bot channel plugin. |
| `extensions/qwen/` | [extensions/qwen/README.md](extensions/qwen/README.md) | kairos Qwen Cloud provider plugin. |
| `extensions/runway/` | [extensions/runway/README.md](extensions/runway/README.md) | kairos Runway video provider plugin. |
| `extensions/searxng/` | [extensions/searxng/README.md](extensions/searxng/README.md) | kairos SearXNG plugin. |
| `extensions/senseaudio/` | [extensions/senseaudio/README.md](extensions/senseaudio/README.md) | kairos SenseAudio media-understanding provider. |
| `extensions/sglang/` | [extensions/sglang/README.md](extensions/sglang/README.md) | Bundled provider plugin for SGLang discovery and setup. |
| `extensions/shared/` | [extensions/shared/README.md](extensions/shared/README.md) | Plugin Kairos para shared. |
| `extensions/signal/` | [extensions/signal/README.md](extensions/signal/README.md) | kairos Signal channel plugin. |
| `extensions/skill-workshop/` | [extensions/skill-workshop/README.md](extensions/skill-workshop/README.md) | kairos skill workshop plugin. |
| `extensions/slack/` | [extensions/slack/README.md](extensions/slack/README.md) | kairos Slack channel plugin. |
| `extensions/speech-core/` | [extensions/speech-core/README.md](extensions/speech-core/README.md) | kairos speech runtime package. |
| `extensions/stepfun/` | [extensions/stepfun/README.md](extensions/stepfun/README.md) | kairos StepFun provider plugin. |
| `extensions/synology-chat/` | [extensions/synology-chat/README.md](extensions/synology-chat/README.md) | Synology Chat channel plugin for kairos. |
| `extensions/synthetic/` | [extensions/synthetic/README.md](extensions/synthetic/README.md) | kairos Synthetic provider plugin. |
| `extensions/talk-voice/` | [extensions/talk-voice/README.md](extensions/talk-voice/README.md) | Manage Talk voice selection (list/set). |
| `extensions/tavily/` | [extensions/tavily/README.md](extensions/tavily/README.md) | kairos Tavily plugin. |
| `extensions/telegram/` | [extensions/telegram/README.md](extensions/telegram/README.md) | kairos Telegram channel plugin. |
| `extensions/tencent/` | [extensions/tencent/README.md](extensions/tencent/README.md) | kairos Tencent Cloud provider plugin (TokenHub + Token Plan). |
| `extensions/test-support/` | [extensions/test-support/README.md](extensions/test-support/README.md) | Plugin Kairos para test support. |
| `extensions/thread-ownership/` | [extensions/thread-ownership/README.md](extensions/thread-ownership/README.md) | Prevents multiple agents from responding in the same Slack thread. Uses HTTP calls to the slack-forwarder ownership API. |
| `extensions/tlon/` | [extensions/tlon/README.md](extensions/tlon/README.md) | Tlon/Urbit channel plugin for kairos. Supports DMs, group mentions, and thread replies. |
| `extensions/together/` | [extensions/together/README.md](extensions/together/README.md) | kairos Together provider plugin. |
| `extensions/tokenjuice/` | [extensions/tokenjuice/README.md](extensions/tokenjuice/README.md) | Bundled tokenjuice exec output compaction plugin. |
| `extensions/tts-local-cli/` | [extensions/tts-local-cli/README.md](extensions/tts-local-cli/README.md) | kairos local CLI TTS plugin. |
| `extensions/twitch/` | [extensions/twitch/README.md](extensions/twitch/README.md) | Twitch channel plugin for kairos. |
| `extensions/venice/` | [extensions/venice/README.md](extensions/venice/README.md) | kairos Venice provider plugin. |
| `extensions/vercel-ai-gateway/` | [extensions/vercel-ai-gateway/README.md](extensions/vercel-ai-gateway/README.md) | kairos Vercel AI Gateway provider plugin. |
| `extensions/video-generation-core/` | [extensions/video-generation-core/README.md](extensions/video-generation-core/README.md) | kairos video generation runtime package. |
| `extensions/vllm/` | [extensions/vllm/README.md](extensions/vllm/README.md) | Bundled provider plugin for vLLM discovery and setup. |
| `extensions/voice-call/` | [extensions/voice-call/README.md](extensions/voice-call/README.md) | Official Voice Call plugin for **kairos**. |
| `extensions/volcengine/` | [extensions/volcengine/README.md](extensions/volcengine/README.md) | kairos Volcengine provider plugin. |
| `extensions/voyage/` | [extensions/voyage/README.md](extensions/voyage/README.md) | kairos Voyage embedding provider plugin. |
| `extensions/vydra/` | [extensions/vydra/README.md](extensions/vydra/README.md) | kairos Vydra media provider plugin. |
| `extensions/web-readability/` | [extensions/web-readability/README.md](extensions/web-readability/README.md) | kairos local Readability web extraction plugin. |
| `extensions/webhooks/` | [extensions/webhooks/README.md](extensions/webhooks/README.md) | kairos webhook bridge plugin. |
| `extensions/whatsapp/` | [extensions/whatsapp/README.md](extensions/whatsapp/README.md) | kairos WhatsApp channel plugin. |
| `extensions/xai/` | [extensions/xai/README.md](extensions/xai/README.md) | kairos xAI plugin. |
| `extensions/xiaomi/` | [extensions/xiaomi/README.md](extensions/xiaomi/README.md) | kairos Xiaomi provider plugin. |
| `extensions/zai/` | [extensions/zai/README.md](extensions/zai/README.md) | kairos Z.AI provider plugin. |
| `extensions/zalo/` | [extensions/zalo/README.md](extensions/zalo/README.md) | Zalo channel plugin for kairos (Bot API). |
| `extensions/zalouser/` | [extensions/zalouser/README.md](extensions/zalouser/README.md) | kairos extension for Zalo Personal Account messaging via native `zca-js` integration. |

### Documentação (`docs/`)
| Pasta | README | O que contem |
|---|---|---|
| `docs/ai-tools/` | [docs/ai-tools/README.md](docs/ai-tools/README.md) | Documentacao auxiliar em docs/ai-tools. |
| `docs/assets/` | [docs/assets/README.md](docs/assets/README.md) | Documentacao auxiliar em docs/assets. |
| `docs/automation/` | [docs/automation/README.md](docs/automation/README.md) | Documentacao auxiliar em docs/automation. |
| `docs/channels/` | [docs/channels/README.md](docs/channels/README.md) | Documentacao auxiliar em docs/channels. |
| `docs/cli/` | [docs/cli/README.md](docs/cli/README.md) | Documentacao auxiliar em docs/cli. |
| `docs/concepts/` | [docs/concepts/README.md](docs/concepts/README.md) | Documentacao auxiliar em docs/concepts. |
| `docs/debug/` | [docs/debug/README.md](docs/debug/README.md) | Documentacao auxiliar em docs/debug. |
| `docs/diagnostics/` | [docs/diagnostics/README.md](docs/diagnostics/README.md) | Documentacao auxiliar em docs/diagnostics. |
| `docs/essentials/` | [docs/essentials/README.md](docs/essentials/README.md) | Documentacao auxiliar em docs/essentials. |
| `docs/gateway/` | [docs/gateway/README.md](docs/gateway/README.md) | Documentacao auxiliar em docs/gateway. |
| `docs/generated-sdk/` | [docs/generated-sdk/README.md](docs/generated-sdk/README.md) | SHA-256 hash files are the tracked drift-detection artifacts. The full JSON |
| `docs/help/` | [docs/help/README.md](docs/help/README.md) | Documentacao auxiliar em docs/help. |
| `docs/i18n/` | [docs/i18n/README.md](docs/i18n/README.md) | Documentacao auxiliar em docs/i18n. |
| `docs/i18n-glossaries/` | [docs/i18n-glossaries/README.md](docs/i18n-glossaries/README.md) | This folder stores translation config for the source docs repo. |
| `docs/images/` | [docs/images/README.md](docs/images/README.md) | Documentacao auxiliar em docs/images. |
| `docs/install/` | [docs/install/README.md](docs/install/README.md) | Documentacao auxiliar em docs/install. |
| `docs/logo/` | [docs/logo/README.md](docs/logo/README.md) | Documentacao auxiliar em docs/logo. |
| `docs/nodes/` | [docs/nodes/README.md](docs/nodes/README.md) | Documentacao auxiliar em docs/nodes. |
| `docs/plan/` | [docs/plan/README.md](docs/plan/README.md) | Documentacao auxiliar em docs/plan. |
| `docs/platforms/` | [docs/platforms/README.md](docs/platforms/README.md) | Documentacao auxiliar em docs/platforms. |
| `docs/plugins/` | [docs/plugins/README.md](docs/plugins/README.md) | Documentacao auxiliar em docs/plugins. |
| `docs/providers/` | [docs/providers/README.md](docs/providers/README.md) | Documentacao auxiliar em docs/providers. |
| `docs/reference/` | [docs/reference/README.md](docs/reference/README.md) | Documentacao auxiliar em docs/reference. |
| `docs/security/` | [docs/security/README.md](docs/security/README.md) | Documentacao auxiliar em docs/security. |
| `docs/snippets/` | [docs/snippets/README.md](docs/snippets/README.md) | Documentacao auxiliar em docs/snippets. |
| `docs/specs/` | [docs/specs/README.md](docs/specs/README.md) | Documentacao auxiliar em docs/specs. |
| `docs/start/` | [docs/start/README.md](docs/start/README.md) | Documentacao auxiliar em docs/start. |
| `docs/superpowers/` | [docs/superpowers/README.md](docs/superpowers/README.md) | Documentacao auxiliar em docs/superpowers. |
| `docs/tools/` | [docs/tools/README.md](docs/tools/README.md) | Documentacao auxiliar em docs/tools. |
| `docs/web/` | [docs/web/README.md](docs/web/README.md) | Documentacao auxiliar em docs/web. |

### SDKs (`sdks/`)
| Pasta | README | O que contem |
|---|---|---|
| `sdks/vscode/` | [sdks/vscode/README.md](sdks/vscode/README.md) | A Visual Studio Code extension that integrates [kairos](https://kairos.ai) directly into your development workflow. |

- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `dev`.
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream
- In `src/config`, follow the existing self-export pattern at the top of the file (for example `export * as ConfigAgent from "./agent"`) when adding a new config module.

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package dirs like `packages/kairos`.

## Type Checking

- Always run `bun typecheck` from package directories (e.g., `packages/kairos`), never `tsc` directly.

