# `packages/sdk`

SDK público do Kairos (`@kairos/sdk`). Exporta a API de alto nível para integradores externos que precisam criar runs, gerenciar sessões e consumir eventos em tempo real através do Kairos Gateway. O bundle final é gerado em `dist/` como módulo ESM com declarações TypeScript.

## Arquivos principais

| Arquivo | Descrição |
|---|---|
| `package.json` | Manifesto do pacote; define entry point `dist/index.mjs` e tipos `dist/index.d.mts` |
| `src/index.ts` | Ponto de entrada público — re-exporta todas as classes, funções e tipos da API |
| `src/client.ts` | Classe principal `kairos` e namespaces: `AgentsNamespace`, `SessionsNamespace`, `RunsNamespace`, `TasksNamespace`, `ModelsNamespace`, `ToolsNamespace`, `ArtifactsNamespace`, `ApprovalsNamespace`, `EnvironmentsNamespace` |
| `src/transport.ts` | `GatewayClientTransport` — implementação de transporte WebSocket sobre o `GatewayClient` interno; gerencia conexão, reconexão e fila de eventos |
| `src/event-hub.ts` | `EventHub` — hub de eventos assíncrono com suporte a replay e streams filtráveis via `AsyncIterable` |
| `src/normalize.ts` | `normalizeGatewayEvent` — converte eventos brutos do Gateway para o formato tipado `kairosEvent` |
| `src/types.ts` | Todos os tipos públicos exportados: `kairosEvent`, `RunResult`, `RunStatus`, `AgentRunParams`, `SessionCreateParams`, `ArtifactSummary`, `SDKError`, entre outros |
| `src/index.test.ts` | Testes unitários da API do SDK |
| `src/index.e2e.test.ts` | Testes end-to-end contra o Gateway real |
| `src/package.e2e.test.ts` | Testes de validação do pacote distribuído (`dist/`) |

## Build

```bash
# A partir da raiz do monorepo
bun run --filter @kairos/sdk build
```

O script usa `tsdown` para compilar `src/index.ts` em `dist/index.mjs` e gerar `dist/index.d.mts`.

## Uso básico

```ts
import { kairos } from "@kairos/sdk";

const client = new kairos({ url: "ws://localhost:4000", token: "..." });

// Criar um run e aguardar o resultado
const run = await client.runs.create({ input: "Olá, Kairos!" });
const result = await run.wait();
console.log(result.status, result.output?.text);

await client.close();
```
