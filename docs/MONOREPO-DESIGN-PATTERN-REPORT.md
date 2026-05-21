# Relatório de Organização de Design Pattern para o Monorepo Kairos

## 1. Resumo

O repositório está em um estado híbrido entre monorepo e aplicação root única. Há sinais claros de estrutura de monorepo (`packages/`, `packages/package.json`, `packages/pnpm-workspace.yaml`) mas a configuração raiz não está consistentes com esse modelo.

## 2. Estado atual identificado

- O repositório contém:
  - `app/` e `src/` como aplicação Next.js / frontend
  - `packages/` com subprojetos como `core`, `tui`, `protocol`, `plugins`, `apps/**`
  - `package.json` raiz com scripts de build/Dev/test para Next/VSCODE
  - `packages/package.json` como agregador de monorepo
  - `packages/pnpm-workspace.yaml` com padrões de workspace adequados
  - `pnpm-lock.yaml` no root e outro em `packages/`
  - `pnpm-workspace.yaml` raiz com conteúdo inválido (`allowBuilds:`), que parece estar no lugar errado

## 3. Problemas principais

### 3.1. Configuração de monorepo inconsistente

- `pnpm-workspace.yaml` na raiz não define os workspaces; contém apenas parâmetros de build (`allowBuilds`), o que é inválido para `pnpm-workspace.yaml`.
- O workspace real parece existir em `packages/pnpm-workspace.yaml`, mas o root do projeto não está configurado corretamente.

### 3.2. Dependências e lockfiles duplicados

- Há `pnpm-lock.yaml` no root e outro em `packages/`.
- Isso pode causar resolução divergente de dependências e falhas ao executar `pnpm install` em diferentes contextos.

### 3.3. Configuração TypeScript fragmentada

- `tsconfig.json` raiz exclui explicitamente `packages`, o que faz com que o editor/compilador ignore o workspace de packages.
- Se o objetivo for monorepo, o `tsconfig` raiz deveria incluir ou referenciar os pacotes compartilhados.

### 3.4. Documentação desalinhada com a estrutura real

- `docs/MONOREPO-TO-SINGLE-PROJECT-MIGRATION.md` sugere migração para projeto único, enquanto a estrutura atual ainda mantém `packages/` como monorepo.
- `repository-pattern.md` descreve uma árvore de projeto que não corresponde exatamente à raiz atual do monorepo.

### 3.5. Scripts e responsabilidades não claras

- `package.json` raiz mistura app, CLI, API e extensão VS Code.
- `packages/package.json` define scripts de monorepo (`pnpm -r build`, `pnpm -r dev`, etc.).
- Falta um padrão claro para onde cada script deve ser definido e executado.

## 4. Recomendação de design pattern conciso

### 4.1. Escolha uma abordagem final

Opção A: Monorepo verdadeiro
- Corrigir `pnpm-workspace.yaml` no root
- Consolidar o lockfile no root
- Manter `packages/` como bibliotecas e serviços compartilhados
- Usar root `package.json` para orquestrar scripts de alto nível
- Usar `packages/package.json` apenas quando necessário para scripts internos de packages

Opção B: Projeto único concluído
- Migrar o código necessário dos `packages/` para o root
- Remover `packages/pnpm-workspace.yaml` e a estrutura de packages se não for mais usada
- Atualizar docs e configs para um único projeto

### 4.2. Se optar por monorepo, organize assim

- `pnpm-workspace.yaml` raiz deve conter padrões de workspaces:
  - `packages/*`
  - `packages/apps/**`
  - `app/` ou `src/` se também quiser tratar como workspace
- Um único `pnpm-lock.yaml` no root
- `tsconfig.json` raiz com paths e `references` para packages compartilhados
- `package.json` raiz com scripts de orquestração e dependências globais
- `packages/package.json` apenas para scripts específicos de pacote

### 4.3. Definição de camadas claras

- `app/` / `src/`: aplicação frontend/Next.js / VS Code
- `packages/core`: lógica compartilhada do serviço/agent
- `packages/tui`: interface TUI
- `packages/protocol`: contratos e tipos compartilhados
- `packages/plugins`: extensão de plugins, canais e ferramentas
- `data/`: persistência e logs de runtime

## 5. Ações imediatas recomendadas

1. Corrigir `pnpm-workspace.yaml` raiz com a lista correta de packages e remover o conteúdo `allowBuilds`.
2. Consolidar lockfile no root; remover `packages/pnpm-lock.yaml` se não for necessário.
3. Ajustar `tsconfig.json` raiz para incluir `packages/` ou criar `tsconfig.base.json` + `tsconfig.app.json` e `tsconfig.package.json`.
4. Definir claramente quais pacotes são workspace e quais arquivos são parte do app principal.
5. Atualizar `docs/MONOREPO-TO-SINGLE-PROJECT-MIGRATION.md` e `repository-pattern.md` para refletir a arquitetura escolhida.
6. Consolidar scripts no `package.json` raiz e mover scripts específicos para cada package conforme necessário.
7. Criar um documento de arquitetura simples e canônico que explique:
   - `Root workspace` -> gerencia dependências e build
   - `packages/` -> bibliotecas reutilizáveis / serviços comuns
   - `app/` -> aplicação

## 6. Observações de prioridade

- Mais urgente: arrumar o `pnpm-workspace.yaml` raiz e o lockfile.
- Em seguida: alinhar TypeScript e documentação à estrutura realmente utilizada.
- Depois: padronizar scripts e responsabilidades para evitar confusão entre root/app/packages.

---

> Este relatório foi gerado a partir da análise da estrutura atual do repositório e dos arquivos de configuração detectados no root e em `packages/`.
