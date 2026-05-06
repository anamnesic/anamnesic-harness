# Análise de `packages/` e Unificação em Kairos

## Visão geral

A pasta `packages/` contém uma mistura de:

- Projeto Kairos real: `packages/core`
- Pacotes TypeScript vazios/placeholder: `packages/protocol`, `packages/plugins`, `packages/apps`
- Projeto TUI em Go: `packages/tui`
- Repositórios externos/orientados a produto: `packages/github-desktop`, `packages/kairos`, `packages/kairos`

## 1. `packages/core`

### O que é
- É o pacote com o nome `kairos-core`.
- Contém código real de runtime de agente, CLI, API, canais, permissões, ferramentas, sessões, LSP, etc.
- É o único `package.json` em `packages/` que representa um módulo Kairos funcional.

### O que pode ser unificado
- Este pacote deve ser o núcleo da unificação em `kairos`.
- Sugestão: mover `packages/core/src` para `src/core` do root ou manter como workspace package principal.
- Manter `packages/core/package.json` se quiser continuar usando a arquitetura monorepo.
- Se você quer um design conciso, centralizar a lógica de agente em `kairos/src/core` e usar o pacote `packages/core` como referência para o código real.

## 2. `packages/protocol`

### O que é
- Pacote TS privado e mínimo com `main: src/index.ts`.
- `src/index.ts` não exporta nada (`export {}`).

### O que pode ser unificado
- Não há conteúdo útil atual.
- Se o objetivo é ter um pacote de contratos/tipos compartilhados, crie ou importe esse código em `src/core` ou `src/protocol` no root.
- Caso contrário, este pacote pode ser removido ou migrado para uma pasta interna de tipos compartilhados.

## 3. `packages/plugins`

### O que é
- Pacote TS privado e mínimo com `main: src/index.ts`.
- `src/index.ts` também é um stub vazio.

### O que pode ser unificado
- Se for apenas placeholder, não há nada para unificar.
- Se você quer um repositório de plugins, pode trazer a estrutura para `src/plugins` no root e, depois, refiná-la.
- Caso contrário, delete ou converta para uma pasta de referência/planejamento.

## 4. `packages/apps`

### O que é
- Outro pacote TS privado e mínimo com arquivo `src/index.ts` vazio.

### O que pode ser unificado
- Similar a `protocol` e `plugins`, não há conteúdo real.
- Se quiser manter um namespace de apps, implemente-o no root ou use `app/` e `src-tauri/` existentes para o front-end.
- Caso contrário, este pacote não adiciona valor e pode ser removido.

## 5. `packages/tui`

### O que é
- Um aplicativo Go separado: `go.mod` e `go.sum` existem.
- Usa `bubbletea`, `glamour`, `lipgloss`, `cobra`, `viper`.
- É uma UI de terminal independente.

### O que pode ser unificado
- Se Kairos precisa de TUI nativa separada, mantenha este projeto como um subprojeto distinto.
- Se a intenção é ter um único código base JS/TS, pode deixar de lado ou migrar a lógica para uma implementação em Node/Next.
- Recomendo não mesclar o Go TUI no root TS, a menos que você realmente queira suportar dois runtimes.

## 6. `packages/github-desktop`

### O que é
- Um fork/clone do repositório GitHub Desktop.
- Conteúdo extenso de Electron, Webpack, scripts de build e dependências específicas.

### O que pode ser unificado
- Não é parte natural de Kairos.
- Deve ser excluído do workspace ou colocado como projeto externo, a menos que haja um motivo explícito para manter o código do GitHub Desktop dentro do mono repo.
- Não unifique esse código com Kairos.

## 7. `packages/kairos`

### O que é
- Projeto kairos: gateway de mensagens multi-canal com plugin SDK.
- Possui exportações, plugin SDK e um CLI próprio.

### O que pode ser unificado
- Pode oferecer inspiração de arquitetura e integração de canais, mas não deve ser fundido diretamente.
- Se precisar de capacidades de canal/messaging, extraia apenas conceitos ou módulos específicos, não o projeto inteiro.
- Melhor tratá-lo como dependência externa ou um repositório paralelo.

## 8. `packages/kairos`

### O que é
- Monorepo do kairos, outro produto AI/Dev.
- Usa Bun, workspaces, app/web/desktop/SDK e muitas dependências específicas.

### O que pode ser unificado
- Também não é core Kairos.
- Não unifique completamente; considere reutilizar ideias ou componentes específicos, mas mantenha separado.

## Recomendações para unificação concisa

1. **Centralize em `packages/core`** ou mova o seu código de agente para `src/core`.
2. **Remova ou desative** `packages/protocol`, `packages/plugins`, `packages/apps` até que tenham conteúdo útil.
3. **Mantenha `packages/tui`** apenas se quiser suporte TUI em Go; caso contrário, trate como projeto separado.
4. **Desvincule projetos externos** (`github-desktop`, `kairos`, `kairos`) do monorepo principal de Kairos.
5. **Crie um workspace claro**: root com `packages/core` + outros pacotes internos reais, não placeholders.
6. **Se precisar de shared-types**, transforme `packages/protocol` em algo real ou mova o tipo para root.

## Conclusão

Dentro de `packages/`, o único pacote que realmente pertence a Kairos é `packages/core`.

Os demais `packages/protocol`, `packages/plugins`, `packages/apps` ainda são placeholders e podem ser limpos.

Os projetos `github-desktop`, `kairos` e `kairos` são repositórios externos e devem ser mantidos fora da unificação central de Kairos, a menos que você queira aproveitar apenas partes específicas como referência.
