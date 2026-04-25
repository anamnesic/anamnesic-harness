# Migração: Monorepo → Projeto Único
## Análise Completa de Adaptações Necessárias

**Data**: Abril 2026  
**Status**: Planejamento de Refatoração  
**Escopo**: Conversão do projeto Kairos de monorepo pnpm (4 packages) para estrutura de projeto único  
**Arquitetura Alvo**: Definida em `repository-pattern.md` — arquitetura orientada a domínios de agente (core, memory, observation, recall, sleep, actions, policies, interfaces, utils)

---

## 1. Estrutura de Diretórios

### Estado Atual (Monorepo)
```
packages/
  ├── core/              # @Kairos/core
  ├── mcp-server/        # @Kairos/mcp-server
  ├── cli/               # @Kairos/cli
  └── vscode/            # Kairos-vscode (VS Code extension)
```

### Estado Alvo (Projeto Único — conforme repository-pattern.md)
```
kairos/
├── src/
│   ├── core/               # agent.ts, decisionEngine.ts, actionEngine.ts, scheduler.ts
│   ├── memory/             # memoryManager.ts, logs/, index/ (vectorStore, metadataStore), summaries/
│   ├── observation/        # eventBus.ts, fileWatcher.ts, observers/ (code, terminal, api)
│   ├── recall/             # retriever.ts, ranking.ts, contextBuilder.ts
│   ├── sleep/              # consolidator.ts, summarizer.ts, pruning.ts
│   ├── actions/            # baseAction.ts, codeActions.ts, notificationActions.ts, systemActions.ts
│   ├── policies/           # permissions.ts, guardrails.ts, approvalFlow.ts
│   ├── config/             # settings.ts, featureFlags.ts
│   ├── interfaces/         # cli.ts, api.ts, dashboard/
│   ├── utils/              # logger.ts, time.ts, embeddings.ts
│   └── main.ts
├── data/                   # Persistência real (fora do src)
│   ├── logs/
│   ├── index/
│   └── summaries/
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

**Mapeamento de Packages → Domínios:**

| Package Atual | Destino no Projeto Único |
|---|---|
| `packages/core/` (entities, services, DB) | `src/core/`, `src/actions/`, `src/policies/`, `src/config/`, `src/utils/` |
| `packages/mcp-server/` (MCP protocol) | `src/interfaces/api.ts` + lógica em domínios |
| `packages/cli/` (Commander.js CLI) | `src/interfaces/cli.ts` |
| `packages/vscode/` (VS Code extension) | `src/interfaces/dashboard/` |
| *(novo)* | `src/memory/` — gerenciamento de memória do agente |
| *(novo)* | `src/observation/` — event bus, watchers, observers |
| *(novo)* | `src/recall/` — recuperação e ranking de contexto |
| *(novo)* | `src/sleep/` — consolidação e sumarização |

**Mudanças Necessárias:**
- [ ] Mapear e mover entities/services de `packages/core/src/` → domínios correspondentes em `src/`
- [ ] Extrair lógica de interface MCP de `packages/mcp-server/src/` → `src/interfaces/api.ts`
- [ ] Extrair comandos CLI de `packages/cli/src/` → `src/interfaces/cli.ts`
- [ ] Extrair lógica da extensão VS Code de `packages/vscode/src/` → `src/interfaces/dashboard/`
- [ ] Criar módulos novos: `src/memory/`, `src/observation/`, `src/recall/`, `src/sleep/`
- [ ] Criar `src/main.ts` como entry point unificado
- [ ] Criar `data/` fora de `src/` para persistência (logs, index, summaries)
- [ ] Consolidar `dist/` em um único diretório raiz
- [ ] Remover arquivos de configuração individuais de cada package

---

## 2. Configuração do TypeScript

### Estado Atual
```
packages/
  ├── core/tsconfig.json              (estende tsconfig.base.json)
  ├── mcp-server/tsconfig.json        (standalone com Node16, customizado para MCP SDK)
  ├── cli/tsconfig.json               (estende tsconfig.base.json)
  └── vscode/tsconfig.json            (estende tsconfig.base.json)

tsconfig.base.json                    (config compartilhada, exports: commonjs)
```

### Estado Alvo
```
tsconfig.json                         (configuração única centralizada)
```

**Desafios de Migração:**

| Aspecto | Atual | Desafio | Solução |
|--------|-------|--------|---------|
| **MCP Server** | `module: Node16, moduleResolution: Node16` | Incompatível com CLI/core (CommonJS) | Usar `"paths"` no tsconfig para resolver MCP SDK via subpath exports |
| **Saída de Módulos** | MCP: ESM, Core/CLI/VSCode: CommonJS | Compilar para múltiplos formatos | Usar `tsc` com `outDir` separados ou esbuild com múltiplos entry points |
| **Decoradores** | `emitDecoratorMetadata: true` | Necessário apenas para TypeORM (Core) | Manter em tsconfig, mas revisar em outras partes |

**Ações Recomendadas:**
- [ ] Criar `tsconfig.json` unificado com `"compilerOptions"` que suporte ambos ESM e CommonJS
- [ ] Usar `"moduleResolution": "bundler"` (suporta Node16 + subpaths)
- [ ] Ou manter múltiplos `tsconfig` mas com hierarquia centralizada
- [ ] Configurar build scripts para compilar MCP separado se necessário

---

## 3. Package.json

### Estado Atual (Root)
```json
{
  "name": "Kairos",
  "scripts": {
    "build": "pnpm -r build",
    "build:core": "pnpm --filter @Kairos/core build",
    "build:mcp": "pnpm --filter @Kairos/mcp-server build",
    "build:cli": "pnpm --filter @Kairos/cli build",
    "build:vscode": "pnpm --filter Kairos-vscode build",
    "dev:core": "pnpm --filter @Kairos/core dev",
    "dev:mcp": "pnpm --filter @Kairos/mcp-server dev",
    "dev:cli": "pnpm --filter @Kairos/cli dev"
  }
}
```

### Estado Alvo (Projeto Único)
```json
{
  "name": "kairos",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc",
    "build:vscode": "esbuild src/interfaces/dashboard/extension.ts --bundle --platform=node --format=cjs --outfile=dist/interfaces/dashboard/extension.js --external:vscode",
    "dev": "tsc --watch",
    "start": "node dist/main.js",
    "start:api": "node dist/interfaces/api.js",
    "start:cli": "node dist/interfaces/cli.js",
    "test": "node scripts/test-integration.js",
    "test:unit": "vitest run --coverage"
  }
}
```

**Mudanças Necessárias:**
- [ ] Eliminar todos os `pnpm --filter` commands
- [ ] Consolidar `dependencies` de todos os packages (deduplicar versões)
- [ ] Remover referências `workspace:*` → usar path local ou direct imports
- [ ] Remover `@Kairos/*` scopes (namespace de monorepo)
- [ ] Revisar `bin` entries (era: `think`, agora single package)
- [ ] Consolidar `devDependencies` (TypeScript, tipos, vitest, etc.)

**Dependências Consolidadas Esperadas:**
```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "jsonwebtoken": "^9.0.3",
    "reflect-metadata": "^0.1.13",
    "sqlite3": "^5.1.7",
    "typeorm": "^0.3.28",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^20.19.39",
    "@vitest/coverage-v8": "^1.2.0",
    "typescript": "^5.1.6",
    "vitest": "^1.2.0",
    "@vscode/vsce-sign": "latest",
    "esbuild": "latest",
    "keytar": "latest"
  },
  "devDependencies": { "onlyBuiltDependencies": ["sqlite3"] }
}
```

---

## 4. Dependências Internas (Imports)

### Estado Atual
```typescript
// Em @Kairos/cli
import { ExportService } from '@Kairos/core';

// Em @Kairos/mcp-server
import { Entity } from '@Kairos/core';

// Em Kairos-vscode
import { validate } from '@Kairos/core';
```

### Estado Alvo
```typescript
// Em src/interfaces/cli.ts
import { schedule } from '../core/scheduler';
import { buildContext } from '../recall/contextBuilder';

// Em src/interfaces/api.ts (MCP)
import { retrieve } from '../recall/retriever';
import { emit } from '../observation/eventBus';

// Em src/interfaces/dashboard/ (VS Code)
import { summarize } from '../sleep/summarizer';
import { memoryManager } from '../memory/memoryManager';

// Em src/actions/codeActions.ts
import { BaseAction } from './baseAction';
import { guardrails } from '../policies/guardrails';

// Em src/memory/memoryManager.ts
import { vectorStore } from './index/vectorStore';
import { metadataStore } from './index/metadataStore';
```

**Processo de Migração:**

1. **Mapear Exports Atuais:**
   - [ ] Verificar `packages/core/src/index.ts` e listar todos os exports públicos
   - [ ] Classificar cada export pelo domínio alvo (`core/`, `memory/`, `actions/`, `policies/`, etc.)
   - [ ] Listar todos os `import { X } from '@Kairos/core'` em todos os packages

2. **Substituir Imports por Domínio:**
   - [ ] `@Kairos/core` (entities, services, DB) → path relativo ao domínio correto (ex: `../memory/memoryManager`, `../actions/codeActions`)
   - [ ] `@Kairos/core` (config, settings) → `../config/settings`
   - [ ] `@Kairos/core` (utils) → `../utils/logger`, `../utils/time`, etc.
   - [ ] Referências internas entre interfaces → `../interfaces/cli`, `../interfaces/api`
   - [ ] Manter `@vscode/*` (SDK nativa, não é escopo do monorepo)

3. **Ajustar Entry Points:**
   - [ ] Substituir os `index.ts` de cada package por `src/main.ts` unificado
   - [ ] MCP server: migrar de entry point standalone → `src/interfaces/api.ts` inicializado via `main.ts`
   - [ ] CLI: migrar de entry point standalone → `src/interfaces/cli.ts` inicializado via `main.ts`
   - [ ] VS Code: migrar extension entry point → `src/interfaces/dashboard/extension.ts`

---

## 5. Build & Output

### Estado Atual (Monorepo)
```
packages/
  ├── core/dist/           # Saída compilada de @Kairos/core
  ├── mcp-server/dist/     # Saída compilada de MCP
  ├── cli/dist/            # Saída compilada de CLI
  └── vscode/dist/         # Saída compilada/empacotada da extensão

pnpm-lock.yaml            # Lock global do monorepo
```

### Estado Alvo (Projeto Único)
```
dist/
  ├── core/
  ├── memory/
  ├── observation/
  ├── recall/
  ├── sleep/
  ├── actions/
  ├── policies/
  ├── config/
  ├── interfaces/
  │   ├── cli.js
  │   ├── api.js             # MCP server
  │   └── dashboard/         # VS Code extension
  ├── utils/
  └── main.js                # Entry point principal

data/                        # Persistência FORA do src (e fora do dist)
  ├── logs/
  ├── index/
  └── summaries/

node_modules/                # Singular
pnpm-lock.yaml               # Singular
```

**Configuração de Build:**

- [ ] Criar `tsconfig.json` com `"rootDir": "src"` e `"outDir": "dist"`
- [ ] Entry point principal: `src/main.ts` → `dist/main.js`
- [ ] Para VS Code extension (bundle necessário):
  ```bash
  esbuild src/interfaces/dashboard/extension.ts \
    --bundle --platform=node --format=cjs \
    --outfile=dist/interfaces/dashboard/extension.js \
    --external:vscode
  ```
- [ ] Garantir que `data/` nunca seja copiado para `dist/` (adicionar ao `.gitignore` e tsconfig `exclude`)

---

## 6. Scripts de Desenvolvimento

### Estado Atual
```bash
pnpm dev:core      # TypeScript watch no core
pnpm dev:cli       # TypeScript watch no CLI
pnpm test          # Rodar testes via scripts/test-integration.js
pnpm build         # Build todos os packages
```

### Estado Alvo
```bash
npm run dev        # TypeScript watch em toda estrutura (src/)
npm run test       # Rodar vitest diretamente
npm run build      # Compilar tudo via tsc
npm run start      # Executar agente principal (dist/main.js)
npm run start:api  # Executar interface MCP (dist/interfaces/api.js)
npm run start:cli  # Executar interface CLI (dist/interfaces/cli.js)
```

**Arquivo `pnpm-workspace.yaml` será:**
- [ ] **Deletado** (não mais necessário)

**Mudanças em `package.json#scripts`:**
- [ ] Substituir `pnpm -r` por `tsc` direto
- [ ] Eliminar `--filter` references
- [ ] Simplificar comandos de desenvolvimento
- [ ] Atualizar CI/CD scripts (`.github/workflows/`, `docker-compose*.yml`)

---

## 7. Docker & Deployments

### Estado Atual
```dockerfile
# Dockerfile (MCP)
WORKDIR /app
RUN pnpm install --frozen-lockfile
RUN pnpm build
ENTRYPOINT ["pnpm", "start:mcp"]

# Dockerfile.cli
WORKDIR /app
RUN pnpm install --frozen-lockfile
RUN pnpm build:cli
ENTRYPOINT ["node", "packages/cli/dist/index.js"]

# docker-compose.yml
services:
  mcp-server:
    build: .
    volumes:
      - ./packages/mcp-server/src:/app/packages/mcp-server/src
  cli:
    build:
      dockerfile: Dockerfile.cli
```

### Estado Alvo
```dockerfile
# Dockerfile (agente principal + interface MCP)
WORKDIR /app
RUN pnpm install --frozen-lockfile
RUN pnpm build
ENTRYPOINT ["node", "dist/interfaces/api.js"]

# Dockerfile.cli
WORKDIR /app
RUN pnpm install --frozen-lockfile
RUN pnpm build
ENTRYPOINT ["node", "dist/interfaces/cli.js"]

# docker-compose.yml
services:
  kairos:
    build: .
    volumes:
      - ./src:/app/src
      - ./data:/app/data      # Persistência fora do src
  cli:
    build:
      dockerfile: Dockerfile.cli
```

**Mudanças Necessárias:**
- [ ] Atualizar `WORKDIR` references de `packages/*/src` → `src/*/`
- [ ] Atualizar `ENTRYPOINT` de `packages/*/dist` → `dist/*/`
- [ ] Remover `pnpm -r` e `--filter` em scripts de Docker
- [ ] Revisar volume mounts em `docker-compose*.yml`
- [ ] Atualizar CI/CD pipelines

---

## 8. VS Code Extension

### Estado Atual (Monorepo)
```json
// packages/vscode/package.json
{
  "name": "Kairos-vscode",
  "main": "./dist/extension.js",
  "dependencies": {
    "@Kairos/core": "workspace:*",
    "@vscode/vsce-sign": "...",
    "keytar": "..."
  }
}

// Build command
pnpm build:vscode  // ou vsce package via npm scripts
```

### Estado Alvo
```json
// package.json (top-level)
{
  "name": "kairos",
  "main": "./dist/interfaces/dashboard/extension.js",
  "contributes": { /* definições de extensão VS Code */ },
  "dependencies": {
    "typeorm": "...",
    "@vscode/vsce-sign": "..."
  }
}

// Build command
npm run build:vscode  // esbuild bundle
```

**Considerações Especiais:**

1. **Novo Caminho do Entry Point:**
   - Extension migra de `packages/vscode/src/extension.ts` → `src/interfaces/dashboard/extension.ts`
   - Entry point no bundle: `dist/interfaces/dashboard/extension.js`
   - [ ] Usar esbuild para criar bundle com dependências de domínio (memory, recall, etc.)
   - [ ] Exemplo:
     ```bash
     esbuild src/interfaces/dashboard/extension.ts \
       --bundle \
       --platform=node \
       --format=cjs \
       --outfile=dist/interfaces/dashboard/extension.js \
       --external:vscode
     ```

2. **Native Modules (sqlite3):**
   - sqlite3 é native module, pode ser problemático no bundle
   - [ ] Considerar excluir do bundle e fazer install local
   - [ ] Ou usar `--no-dependencies` flag em vsce

3. **`.vscodeignore` e Files:**
   - [ ] Atualizar `.vscodeignore` para ignorar `src/`, `packages/`, etc.
   - [ ] Manter apenas `dist/vscode-extension/` e dados necessários

---

## 9. Arquivos de Configuração Top-Level

### Arquivos que Serão Removidos
- [ ] `pnpm-workspace.yaml` (monorepo config)
- [ ] `packages/*/tsconfig.json` (substituído por tsconfig base)
- [ ] `packages/*/package.json` (consolidado em root)
- [ ] `packages/*/README.md` (pode ser consolidado em docs/)
- [ ] `packages/*/src/index.ts` (exports consolidados)

### Arquivos que Serão Modificados
- [ ] `tsconfig.base.json` → `tsconfig.json` (simplificado, suporta múltiplos targets)
- [ ] `package.json` (consolidado, scripts simplificados)
- [ ] `pnpm-lock.yaml` (recriado via `pnpm install`)
- [ ] `docker-compose*.yml` (updated paths)
- [ ] `Dockerfile` e `Dockerfile.cli` (updated workdir/entrypoints)
- [ ] `nginx.conf` (se usar, verificar paths)
- [ ] `.github/workflows/*.yml` (CI/CD updates)

### Estrutura de Configuração Alvo
```
kairos/
├── tsconfig.json                    # Configuração central
├── package.json                     # Consolidado
├── pnpm-lock.yaml                   # Regenerado
├── Dockerfile                       # Atualizado
├── Dockerfile.cli                   # Atualizado
├── docker-compose.yml               # Atualizado
├── docker-compose.dev.yml           # Atualizado
├── docker-compose.prod.yml          # Atualizado
├── docker-compose.monitoring.yml    # Atualizado
├── .vscodeignore                    # Atualizado
├── nginx.conf                       # Se aplicável
└── .github/workflows/*.yml          # CI/CD atualizado
```

---

## 10. Testes

### Estado Atual
```bash
pnpm test                           # Rodar scripts/test-integration.js (27 testes)
pnpm test:unit                      # Rodar vitest cover
pnpm --filter @Kairos/core test     # Rodar testes apenas de core
```

### Estado Alvo
```bash
npm test                            # Rodar scripts/test-integration.js
npm run test:unit                   # Rodar vitest cover
npm run test -- src/core            # Rodar testes apenas de core (if organized by path)
```

**Considerações:**
- [ ] Revisar `scripts/test-integration.js` (ainda válido para projeto único)
- [ ] Atualizar imports de módulos em arquivos de teste
- [ ] Reorganizar fixtures/mocks se estiverem em `packages/*/tests/`
- [ ] Consolidar cobertura de testes em `coverage/`

---

## 11. CI/CD & GitHub Actions

### Workflows Afetados
```
.github/workflows/
├── test.yml         # tsc typecheck usa --filter, precisa atualizar
├── build.yml        # build usa pnpm -r, precisa atualizar
├── deploy.yml       # referencia packages/*, precisa atualizar
└── release.yml      # versioning de monorepo, revisão necessária
```

### Mudanças Necessárias em Workflows
- [ ] Remover `pnpm --filter` em todos os jobs
- [ ] Atualizar caminhos de artifacts: `packages/*/dist/` → `dist/*/`
- [ ] Simplificar build steps
- [ ] Atualizar versioning strategy (não precisa de 4 versões separadas)

**Exemplo antes:**
```yaml
- run: pnpm ci:typecheck
  # Dentro: pnpm --filter @Kairos/core exec tsc --noEmit
```

**Exemplo depois:**
```yaml
- run: pnpm exec tsc --noEmit
```

---

## 12. Documentação

### Arquivos que Precisam Update
- [ ] `README.md` (remove referências a "packages", simplifica setup)
- [ ] `GETTING-STARTED.md` (update install/dev commands)
- [ ] `docs/architecture/TECHNICAL_ARCHITECTURE.md` (remove monorepo layers)
- [ ] `docs/deployment/DEPLOYMENT_CHECKLIST.md` (update build/deploy steps)
- [ ] Individual `packages/*/README.md` → consolidar em `docs/`

### Novo Conteúdo a Documentar
- [ ] Novo layout de estrutura `src/`
- [ ] Nova strategy de build
- [ ] Path resolution updated
- [ ] Deployment workflow simplificado

---

## 13. Summary de Mudanças de Alto Nível

| Item | Antes | Depois | Esforço |
|------|-------|--------|--------|
| **Diretórios** | `packages/{core,mcp,cli,vscode}/` | `src/{core,memory,observation,recall,sleep,actions,policies,config,interfaces,utils}/` | Alto |
| **TypeScript Config** | 5 arquivos (base + 4 específicos) | 1 arquivo centralizado | Pequeno |
| **Imports** | `@Kairos/*` scopes | Path imports por domínio (`../memory/`, `../actions/`, etc.) | Alto |
| **Package.json** | 5 arquivos + lock | 1 arquivo consolidado | Médio |
| **Scripts** | `pnpm --filter` | `tsc` / `node dist/main.js` direto | Pequeno |
| **Docker** | Paths `packages/*/dist/` | Paths `dist/interfaces/` | Pequeno |
| **CI/CD** | `--filter` em workflows | Simplificado | Pequeno |
| **Build Output** | `packages/*/dist/` | `dist/` único com subdomínios | Pequeno |
| **Dependências** | Distribuídas por package | Uma única `package.json` | Médio |
| **Novos Módulos** | Não existem | `src/memory/`, `src/observation/`, `src/recall/`, `src/sleep/` | Alto |
| **Persistência** | Inline em packages | `data/` fora de `src/` (logs, index, summaries) | Médio |

---

## 14. Plano de Execução Recomendado

### Fase 1: Preparação
- [ ] Criar branch de feature: `refactor/monorepo-to-single`
- [ ] Documentar todos os imports @Kairos/* no codebase
- [ ] Backup de `pnpm-lock.yaml` para referência futura

### Fase 2: Reorganização de Diretórios
- [ ] Criar estrutura de domínios conforme repository-pattern.md:
  - `src/core/`, `src/memory/`, `src/observation/`, `src/recall/`, `src/sleep/`
  - `src/actions/`, `src/policies/`, `src/config/`, `src/interfaces/`, `src/utils/`
- [ ] Mapear e mover conteúdo de `packages/core/src/` → domínios correspondentes (`core/`, `actions/`, `policies/`, `config/`, `utils/`)
- [ ] Mover `packages/mcp-server/src/` → `src/interfaces/api.ts` + lógica distribuída por domínio
- [ ] Mover `packages/cli/src/` → `src/interfaces/cli.ts`
- [ ] Mover `packages/vscode/src/` → `src/interfaces/dashboard/`
- [ ] Criar `src/main.ts` como entry point unificado
- [ ] Criar `data/{logs,index,summaries}/` fora de `src/`
- [ ] Verificar que nenhum arquivo foi perdido

### Fase 3: Consolidação de Configuração
- [ ] Mesclar `tsconfig.json` de cada package em `tsconfig.json` root
- [ ] Consolidar `package.json` de todos os packages
- [ ] Atualizar `pnpm-lock.yaml` (rodar `pnpm install`)

### Fase 4: Atualização de Imports
- [ ] Substituir `@Kairos/core` por imports de domínio específicos (ex: `../memory/memoryManager`, `../actions/codeActions`)
- [ ] Atualizar referências internas do MCP server para `../interfaces/api`
- [ ] Atualizar referências internas do CLI para `../interfaces/cli`
- [ ] Atualizar entry points da extensão VS Code para `../interfaces/dashboard/`
- [ ] Adicionar `src/main.ts` com bootstrap de todos os módulos
- [ ] Testar que compilação funciona (`tsc --noEmit`)

### Fase 5: Atualização de Build
- [ ] Remover `pnpm-workspace.yaml`
- [ ] Atualizar scripts em `package.json`
- [ ] Testar `npm run build`
- [ ] Testar `npm run dev`

### Fase 6: Docker & Deployment
- [ ] Atualizar `Dockerfile` e `Dockerfile.cli`
- [ ] Atualizar `docker-compose*.yml`
- [ ] Testar build docker

### Fase 7: CI/CD
- [ ] Atualizar `.github/workflows/*.yml`
- [ ] Testar em branch antes de merge

### Fase 8: Testes & Validação
- [ ] Rodar `npm test`
- [ ] Rodar `npm run test:unit`
- [ ] Verificar CLI funcional: `node dist/interfaces/cli.js`
- [ ] Verificar MCP/API funcional: `node dist/interfaces/api.js`
- [ ] Verificar VS Code extension faz bundle e carrega: `npm run build:vscode`
- [ ] Verificar que `data/` está sendo criado fora de `src/` em runtime
- [ ] Verificar que módulos novos (memory, observation, recall, sleep) compilam sem erros

### Fase 9: Documentação
- [ ] Atualizar README.md
- [ ] Atualizar docs/
- [ ] Cleanup de README.md em diretórios removidos

### Fase 10: Merge & Release
- [ ] Merge no main após aprovação de PR
- [ ] Tag de nova versão (ex: v2.0.0)
- [ ] Deploy de nova versão

---

## 15. Potenciais Riscos & Mitigação

| Risco | Impacto | Mitigação |
|-------|--------|-----------|
| Native modules (sqlite3) quebram build | Alto | Testar build/runtime após consolidação |
| Imports circulares entre domínios (`memory` ↔ `recall` ↔ `core`) | Médio | Definir sentido único de dependência (core → rest, interfaces importam domínios) |
| Mapeamento incorreto de código de `packages/core` para domínios novos | Alto | Revisar cada export antes de mover, classificar pelo domínio correto |
| VS Code extension não bundla corretamente com novos paths | Alto | Testar esbuild bundle após mover para `src/interfaces/dashboard/` |
| `data/` sendo incluído no `dist/` acidentalmente | Médio | Adicionar `data/` ao `exclude` do tsconfig e ao `.dockerignore` |
| Novos módulos (`memory/`, `observation/`, etc.) sem implementação | Alto | Criar stubs ou arquivos com interfaces mínimas antes de compilar |
| Testes falham após consolidação de imports | Médio | Rodar testes logo após refactor de imports |
| Docker builds quebram por caminhos antigos | Médio | Testar `docker build` em fase 6 |
| CI/CD workflows ainda referenciam `packages/` | Médio | Validar em ambiente de staging antes do main |
| TypeORM decorators não funcionam em novo contexto | Pequeno | Revisar tsconfig `emitDecoratorMetadata` |

---

## 16. Checkpoints de Validação

Após cada fase, validar:
- [ ] Código compila sem erros (`tsc --noEmit`)
- [ ] Imports resolvem corretamente
- [ ] Testes passam (`npm test`)
- [ ] Executáveis de interfaces funcionam (`dist/interfaces/cli.js`, `dist/interfaces/api.js`)
- [ ] `data/` criado fora de `src/` em runtime
- [ ] Extension VS Code carrega sem erros
- [ ] Docker builds bem-sucedido

---

## Conclusão

A conversão de monorepo para projeto único é uma refatoração de **baixa complexidade** em termos de conceito, mas **média complexidade** em escopo (3-4 dias de esforço estimado, dependendo de cobertura de testes e documentação).

**Benefícios:**
✅ Simplificação de build/dev setup  
✅ Menos overhead de gerenciamento de lockfile  
✅ Redução de complexidade em CI/CD  
✅ Mais fácil de onboard novos desenvolvedores  

**Desvantagens:**
❌ Menos modularidade (já não há separação clara de packages)  
❌ Build mais monolítico (tudo compilado junto)  
❌ Mais cuidado com imports circulares  

**Recomendação Final:**
Proceder com refactor se o projeto não se beneficia de independência dos packages. Se MCP server, CLI, e VS Code extension precisam se manter desacoplados, considerar manter monorepo mas com melhor automação.
