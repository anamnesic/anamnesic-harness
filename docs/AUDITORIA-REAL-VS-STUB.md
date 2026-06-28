# Auditoria de Módulos: Real vs Stub

> Gerado em 2026-06-28 — análise de cada módulo do runtime core.

## Lenda

| Status | Significado |
|--------|-------------|
| **REAL** | Implementação funcional com lógica real |
| **STUB** | Retorna valores hardcoded, sem computação real |
| **SKELETON** | Tem estrutura/tipos mas corpos vazios |
| **UNUSED** | Existe mas não é importado |

---

## Level 1 — Core Runtime (`packages/core/src/core/src/`)

### providers/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `OpenAIProvider` | ~~STUB~~ **REMOVED** | `simulateAPICall()` com 200ms delay, resposta hardcoded |
| `AnthropicProvider` | ~~STUB~~ **REMOVED** | `simulateAPICall()` com 300ms delay, resposta hardcoded |
| `ProviderRegistry` | **REAL** | Map-based registry com register/unregister/get/list/getProviderForModel |
| `types.ts` | **REAL** | Interfaces e tipos usados por toda a codebase |

### sessions/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `SessionManager` | **REAL** | Orquestração: context window, auto-title, message routing, token tracking |
| `JSONLSessionStorage` | **REAL** | I/O real com `fs/promises` (appendFile, readFile, mkdir) |
| `InMemorySessionMetadataStore` | **REAL** | ~~SQLiteSessionMetadataStore~~ renomeado. Map em memória, funcional |
| `InMemoryEmbeddingStore` | **REAL** | ~~LanceDBEmbeddingStore~~ renomeado. Map em memória + cosine similarity |

### agent/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `AgentRuntime` | **REAL** (callLLM stub) | Lógica de rate limiting, fallback, model selection é real. `callLLM()` é stub (timeout + hardcoded) |

### security/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `PairingManager` | **REAL** | Pairing codes com expiry, listeners, approval workflow |
| `ChannelAllowlist` | **REAL** | Allowlist por canal/user com check/revoke |
| `MentionGate` | **REAL** | Regex-based mention detection |
| `ToolSandbox` | ~~STUB~~ **REMOVED** | Docker/SSH retornavam placeholder strings |

### api/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `CoreServer` | **REAL** | WebSocket server real com `ws`, testado |
| `WebSocketAPI` | **REAL** | Message protocol: chat, session sync, presence, broadcasting |
| `HTTPAPI` | ~~SKELETON~~ **REMOVED** | Sem servidor HTTP, roteamento in-memory |

### plugins/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `CorePluginRegistry` | **REAL** | `import()` dinâmico real, descoberta de manifestos, lifecycle |

### channels/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `MessageGateway` | **REAL** | Plugin registration, message routing, broadcast com error isolation |

### tools/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `ToolRegistry` | **REAL** | Register, lookup, handler dispatch, streaming |
| `ToolOrchestrator` | **REAL** | Permission check + execution dispatch chain |
| `DefaultPermissionManager` | **REAL** | Múltiplos modos (yolo, always-allow, owner-only, interactive) |

### permissions/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `CorePermissionManager` | **REAL** | Memory store, listener pattern, granular permission model |

### lsp/
| Módulo | Status | Evidência |
|--------|--------|-----------|
| `LSPManager` | ~~SKELETON~~ **REMOVED** | `spawn()` sem protocolo LSP, diagnostics nunca populados |

---

## Level 2 — Serviços (`packages/core/src/agent/core/services/`)

Todos os 72 serviços são **REAIS**, incluindo:

| Service | Linhas | O que faz |
|---------|--------|-----------|
| `ProactivePlannerService` | 368 | Geração de planos via LLM com Zod validation, vault persistence, timer |
| `AdaptiveOrchestratorService` | 484 | Plano multi-step com policy enforcement, complexity estimation |
| `AgentService` | 378 | CRUD via TypeORM, 17 prebuilt agents, import de skills externas |
| `SelfOptimizationService` | 318 | LLM-driven optimization plans baseado em metrics + benchmarks |
| `RollbackService` | 71 | Delega ao SnapshotService.restore() |
| + 40+ outros | — | Todos com implementações completas |

---

## Level 3 — Outros Pacotes

| Pacote | Status | Evidência |
|--------|--------|-----------|
| `packages/vault/` | **REAL** | AES-256-GCM usando `node:crypto`. Sync + async APIs. Path traversal protection |
| `packages/state/` | **REAL** | 85 hooks, 146 componentes React, 10 context providers |
| `packages/editor/` | **REAL** | Bridge messaging, keybindings, vim emulation, native integrations |
| `packages/integrations/` | **REAL** | Slack bot, Cloudflare Worker, 57 skills |
| `infra/` | **REAL** | SST/Ion deploy (Cloudflare, Stripe, PlanetScale), Fly.io, Render |
| `app/` | **REAL** | Next.js app (landing + dashboard + API routes) |

---

## Resumo

```
MÓDULO                    REAL       STUB/SKELETON
─────────────────────────────────────────────────
packages/vault/           ✅
packages/state/           ✅
packages/editor/          ✅
packages/integrations/    ✅
infra/                    ✅
agent/core/services/      ✅  (72)
tools/                    ✅
permissions/              ✅
channels/                 ✅
api/CoreServer            ✅
api/WebSocketAPI          ✅
plugins/                  ✅
sessions/                 ✅  (3/3)
agent/AgentRuntime        ✅  (callLLM pendente)
providers/OpenAI          ❌  removido
providers/Anthropic       ❌  removido
security/ToolSandbox      ❌  removido
api/HTTPAPI               ❌  removido
lsp/LSPManager            ❌  removido
```

**Próximo passo:** Implementar providers reais (OpenAI, Anthropic) usando as extensões em `extensions/openai/` e `extensions/anthropic/`, que já têm código real.
