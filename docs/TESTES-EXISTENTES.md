# Inventário de Testes

> Gerado em 2026-06-28 — levantamento completo de todos os testes no monorepo.

## Framework

| Pacote | Framework | Config |
|--------|-----------|--------|
| `packages/core/src/core` | **Vitest v1.x** | `vitest.config.ts` |
| `packages/ui` | **Vitest v4.x** | `vitest.config.ts` (3 projetos: unit, unit-node, browser) |
| `packages/sdk` | **Vitest** | usa config do workspace |
| `packages/contract` | **Vitest** | usa config do workspace |
| `packages/kairoscode` | **Bun test** | `bun test` diretamente |
| `packages/devtools` | **Vitest v4.x** | `vitest.config.ts` (56 sub-configs) |
| `extensions/*` | **Vitest** | usa config do workspace |

## Core Runtime (`packages/core/src/core/src/__tests__/`)

| Arquivo | Foco | Status |
|---------|------|--------|
| `e2e.test.ts` | Server startup, WebSocket, session sync, tool orchestration | ✅ 5/5 |
| `sessions-e2e.test.ts` | Session lifecycle, JSONL persistence, context window | ✅ 5/5 |
| `tools-e2e.test.ts` | ToolRegistry, ToolOrchestrator, permission enforcement | ✅ 3/3 |
| `streaming-e2e.test.ts` | AgentRuntime execute, rate limiting, model selection | ✅ 3/3 |
| `cli.test.ts` | CoreCLIManager, command registration | ✅ 3/3 |
| **Total core** | | **✅ 19/19** |

## Core Agent (`packages/core/src/agent/`)

~30 arquivos de teste cobrindo:
- Services: AgentService, ProjectService, DecisionService, etc.
- LLM CLI: ProviderRoutingStrategy, CliInferenceService, adapters
- Tools: file-tools, run-command
- Sleep: SleepInferenceService
- Recall: ContextBuilder, SemanticRerankService
- Pipeline, Export, Validation, Policies

## Memória (`packages/core/src/memory/`)

18 arquivos de teste no `src/host/`:
- Embeddings, QMD parser/processor, batch, remote HTTP, sessions

## SDK (`packages/sdk/`)

| Arquivo | Status |
|---------|--------|
| `src/index.test.ts` | ❌ Falha — import path resolution error |
| `src/index.e2e.test.ts` | - |
| `src/package.e2e.test.ts` | - |

## UI (`packages/ui/`)

~18 arquivos de teste:
- Componentes: scroll-view, message-file, markdown-stream, etc.
- i18n, styles, theme, navigation, user-identity

## Kairoscode (`packages/kairoscode/`)

**80+ arquivos de teste** (usam Bun test):

| Área | Cobertura |
|------|-----------|
| config/ | agent-color, config, markdown, lsp, tui, plugin |
| cli/ | account, import, error, github-action, github-remote, tui/* |
| server/ | httpapi-*, session-*, workspace-*, provider-*, mcp-*, pty-* |
| control-plane/ | adaptors, sse |
| plugin/ | trigger, auth-override, install |
| pty/ | pty-shell, pty-session, pty-output-isolation |
| bus/ | bus, bus-effect, bus-integration |
| file/ | fsmonitor, ripgrep, path-traversal |
| git/ | git.test |
| lsp/ | launch, client, lifecycle, index |
| storage/ | db, storage, json-migration |
| provider/ | provider, gitlab-duo, amazon-bedrock |
| tool/ | webfetch, skill, task, glob, truncation |
| + mais | auth, format, sync, workspace, permission, project, etc. |

## Extensions

Centenas de testes nas extensões, amostra:

| Extensão | Arquivos |
|----------|----------|
| `ollama/` | 15 test files |
| `xai/` | 18 test files |
| `deepinfra/` | 9 test files |
| `elevenlabs/` | 7 test files |
| `mattermost/` | 15+ test files |
| `github-copilot/` | 10 test files |
| `memory-core/` | 14 test files |
| `voice-call/` | 3 test files |
| + dezenas mais | ~100+ arquivos |

## Total Estimado

**~250+ arquivos de teste** em todo o monorepo.

## Como Rodar

```bash
# Core runtime
cd packages/core/src/core && npx vitest run

# UI
cd packages/ui && npx vitest run

# Kairoscode (usa Bun)
cd packages/kairoscode && bun test

# Extensão específica
cd extensions/openai && npx vitest run
```

## Convenções

| Sufixo | Propósito |
|--------|-----------|
| `.test.ts` | Teste unitário padrão |
| `.live.test.ts` | Teste de integração (excluído do CI) |
| `.contract.test.ts` | Teste de contrato de plugin |
| `.e2e.test.ts` | Teste end-to-end |
