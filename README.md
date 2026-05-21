# KAIROS

> Plataforma de agentes de IA — terminal-native, multi-canal, com memória persistente, vault criptografado e 65+ skills internas.

---

## O que é

**Kairos** é uma plataforma de desenvolvimento e execução de agentes de IA construída como monorepo TypeScript/Node.js.

Vai além de assistentes reativos: opera como uma **camada cognitiva contínua** — observando, memorizando, planejando e agindo de forma autônoma ao longo do tempo.

Componentes principais:

- **Runtime de agentes** com pipeline, memória, tarefas e ferramentas
- **Gateway multi-canal** (Discord, Slack, WhatsApp, Telegram, e 120+ extensões)
- **CLI/TUI terminal-native** com interface Ink/Go
- **UI web/mobile** (Next.js, apps mobile iOS/Android)
- **Vault criptografado** (AES-256-GCM) para dados sensíveis em runtime
- **65 skills internas Kairos** baseadas em referências externas anonimizadas

---

## Princípios

- **Persistência** sobre statelessness
- **Observação** sobre instrução explícita
- **Proatividade** sobre reatividade
- **Memória longa** sobre janela de contexto

---

## Monorepo — Estrutura de Código

```
kairos/
├── packages/                   # Pacotes workspace (pnpm)
│   ├── core/                   # Runtime do agente — pipeline, memória, tarefas, serviços, migrações
│   ├── cli/                    # CLI/TUI terminal — comandos, Ink, telas, entrypoints
│   ├── ui/                     # Interface — app, desktop, enterprise, web, console, Storybook
│   │   └── public/             # Assets estáticos (favicon, logo, manifest PWA)
│   ├── vault/                  # Vault AES-256-GCM — dados criptografados em runtime
│   ├── plugins/                # Sistema de plugins — runtime, SDK, contrato, OpenAPI
│   ├── state/                  # Estado da UI — context, hooks, componentes, boot
│   ├── integrations/           # Integrações externas — skills, Slack, funções, voz
│   ├── editor/                 # Integrações de editor — keybindings, vim, bridge, native
│   ├── infra/                  # Infraestrutura — protocolo, tipos, constantes, schemas, proxy
│   ├── kairoscode/             # Runtime Kairos Code (v1.14.30)
│   ├── devtools/               # Dev tooling — scripts, containers, vendor, patches, QA
│   └── ...
│
├── apps/                       # Aplicações clientes
│   ├── ios/                    # App iOS (Swift)
│   ├── android/                # App Android (Kotlin)
│   └── shared/                 # Kit compartilhado (OpenClawKit)
│
├── extensions/                 # 120+ extensões de providers/canais
│   ├── openai/, anthropic/, google/, xai/, mistral/, ...
│   ├── discord/, slack/, telegram/, whatsapp/, signal/, ...
│   ├── browser/, brave/, memory-core/, memory-lancedb/, ...
│   └── ...
│
├── sdks/
│   └── vscode/                 # Extensão VS Code (publisher: sst-dev)
│
├── github/                     # GitHub Action (uses: sst/kairos/github@latest)
│
├── data/                       # Runtime — gitignored, criptografado via vault
│   └── skills/kairos/          # 65 skills internas (.md com frontmatter YAML)
│
├── docs/                       # Documentação
│   └── specs/                  # Especificações do projeto
│
├── infra/                      # Deploy — SST / Fly.io / Render
├── nix/                        # Builds reproduzíveis (Nix flakes)
├── assets/                     # Assets visuais (logo, DMG background)
├── scripts/                    # Scripts de release, CI, build, publicação
└── patches/                    # Patches pnpm
```

---

## Skills Internas (Vault)

65 skills em `data/skills/kairos/` no formato `kairos_nome_versao.md`:

| Categoria | Skill | Capacidades |
|-----------|-------|-------------|
| `coding` | KairosForge, KairosEngineer, KairosFlow, KairosDroid, KairosCloud | Pair programming, LSP, refatoração, contexto de editor |
| `agent` | KairosAgent, KairosBuilder, KairosOrbit | Execução autônoma, scaffold de projetos, orquestração |
| `conversation` | KairosAurora, KairosNova, KairosEcho, KairosLingua | Raciocínio, ética, multilíngue, chat avançado |
| `research` | KairosPrism, KairosDawn, KairosScout | Busca profunda, raciocínio, web research |
| `ui` | KairosCanvas, KairosStudio, KairosArtisan | Geração de UI, componentes, design systems |
| `browser` | KairosNavigator, KairosCompass, KairosGuard | Automação web, extração, privacidade |
| `multimodal` | KairosSpectrum, KairosEdge | Imagem, áudio, tempo real |
| `voice` | KairosEmpathy | IA de voz empática |
| `analysis` | KairosLens | Análise contextual, overlay |

Skills são criptografadas pelo vault em runtime. Formato:
```yaml
---
id: kairosforge-cursor-2-0-sys-prompt
name: KairosForge
version: "1.0.0"
category: coding
capabilities:
  - pair-programming
  - lsp-diagnostics
use_for:
  - "Pair programming com contexto total do editor"
---
# System prompt...
```

---

## Vault (Segurança)

Todos os dados sensíveis em `data/` são criptografados via `@kairos/vault`:

- **Algoritmo**: AES-256-GCM
- **Chave**: variável de ambiente `KAIROS_VAULT_KEY` (hex 64 chars = 32 bytes)
- **Fallback**: fail-closed (erro se chave ausente, a menos que `KAIROS_VAULT_ALLOW_PLAINTEXT=1`)

```bash
# Gerar chave
pnpm vault:init

# Migrar dados plaintext para vault
KAIROS_VAULT_KEY=<hex> pnpm vault:migrate

# Migrar skills para vault
KAIROS_VAULT_KEY=<hex> pnpm vault:skills
```

---

## Instalação

```bash
# Requisitos: Node.js 22+, pnpm 9+
pnpm install
```

### Desenvolvimento

```bash
pnpm dev            # Next.js UI (packages/ui)
pnpm build          # Build da UI
pnpm build:backend  # Build do backend TypeScript
```

### Agentes

```bash
node dist/agent/interfaces/api/start-api.js     # API/MCP
node dist/agent/interfaces/cli/index.js         # CLI
node dist/agent/interfaces/cli/index.js swe-agent run \
  --objective "Refatorar o módulo de logging" \
  --provider openai --model gpt-4o-mini \
  --api-key $KAIROS_API_KEY
```

### Testes

```bash
pnpm test           # Integração
pnpm test:unit      # Unit com cobertura
pnpm typecheck      # Type-check
pnpm check          # Lint + format (oxlint + oxfmt)
```

---

## Variáveis de Ambiente

```env
KAIROS_VAULT_KEY=<hex64>            # Chave do vault (obrigatório em produção)
KAIROS_VAULT_ALLOW_PLAINTEXT=1      # Permite fallback plaintext (dev apenas)

KAIROS_PROVIDER=openai
KAIROS_MODEL=gpt-4o-mini
KAIROS_API_KEY=...
KAIROS_BASE_URL=https://api.openai.com
```

---

## Arquitetura

```
  ┌─────────────────────────────────────────────────────┐
  │                  Clients / Interfaces               │
  │  CLI/TUI  │  Web UI  │  iOS/Android                 │
  └──────────────────────┬──────────────────────────────┘
                         │
  ┌──────────────────────▼──────────────────────────────┐
  │                  @kairos/core                       │
  │  Agent Pipeline · Memory · Tasks · Tools · Services │
  └──────┬──────────────────────────────────┬───────────┘
         │                                  │
  ┌──────▼──────────┐              ┌────────▼────────────┐
  │  @kairos/vault  │              │  extensions/ (120+) │
  │  AES-256-GCM    │              │  Providers · Canais  │
  └─────────────────┘              └─────────────────────┘
```

---

## Segurança

Ver [SECURITY.md](./SECURITY.md).

- Vault criptografado para todos os dados de runtime
- Skills internas com nomes anonimizados (sem referência a sistemas externos)
- Feature flags e approval layers para ações autônomas
- Audit logs de todas as decisões e ações

---

## Licença

[MIT](./LICENSE)

