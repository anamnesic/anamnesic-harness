# REORGANIZATION.md

## Padrão Adotado
- **Monorepo Modular (Clean Architecture orientada a domínio)**
- Cada pacote em `packages/` é um módulo isolado (core, mcp-server, cli, vscode)
- Pastas internas seguem separação por domínio e responsabilidade: `agents/`, `entities/`, `services/`, `events/`, `pipeline/`, `providers/`, `types/`, `utils/`, etc.

## Estrutura Antes
- Pastas soltas na raiz: `api/`, `components/`, `entities/`, `pages/`, `services/`, `App.tsx`, `index.ts`
- Estrutura dos pacotes já modularizada em `packages/`

## Estrutura Depois
- Todo o código de aplicação está em `packages/`:
  - `core`: lógica de domínio, entidades, serviços, tipos, utilitários
  - `mcp-server`: endpoints, integração backend, orquestração
  - `cli`: comandos CLI
  - `vscode`: extensão VS Code
- Pastas e arquivos soltos na raiz (`api/`, `components/`, `entities/`, `pages/`, `services/`, `App.tsx`, `index.ts`) foram migrados para `packages/core/src/` conforme o domínio:
  - `api/` → `packages/core/src/agents/`
  - `components/` → `packages/core/src/agents/`
  - `entities/` → `packages/core/src/entities/`
  - `pages/` → `packages/core/src/views/`
  - `services/` → `packages/core/src/services/`
  - `App.tsx`, `index.ts` → `packages/core/src/`

## Mudanças Realizadas
- Migrados arquivos e pastas soltos para dentro de `packages/core/src/`.
- Corrigidos imports relativos nos arquivos migrados.
- Mantida a estrutura modular dos pacotes.
- Removidos arquivos duplicados e nomes inconsistentes.
- Atualizada a documentação de organização.

## Observações
- O projeto agora segue Clean Architecture modular, com separação clara de domínio e infraestrutura.
- Todos os arquivos de código-fonte estão centralizados em `packages/`.
- Testes permanecem em `__tests__/` na raiz do monorepo.

---

Organização executada pelo agente Organizer em conformidade com padrões profissionais de arquitetura para monorepos TypeScript.