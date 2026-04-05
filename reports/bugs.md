# ThinkCoffee - Bug Report

**Data:** 2026-05-04
**Autor:** QA Engineer (Troubleshooter)
**Versao:** 1.0.0

---

## Resumo

Relatorio de bugs identificados durante a execucao dos testes unitarios e de integracao do projeto ThinkCoffee.

---

## BUG-001: Singleton do Database impede multiplos testes isolados

- **Severidade:** Media
- **Status:** Aberto
- **Componente:** `packages/core/src/database.ts`
- **Descricao:** A funcao `getDatabase()` usa um singleton (`dataSource`) no escopo do modulo. Uma vez inicializado, chamadas subsequentes retornam a mesma conexao, mesmo que `options.dbPath` seja diferente.
- **Impacto:** Testes unitarios que precisam de bancos in-memory independentes podem compartilhar estado.
- **Reproducao:**
  1. Chamar `getDatabase({ dbPath: ':memory:' })` no primeiro teste.
  2. Chamar `getDatabase({ dbPath: ':memory:' })` no segundo teste.
  3. Ambas retornam a mesma instancia.
- **Workaround:** Chamar `closeDatabase()` entre suites, ou usar `new DataSource(...)` diretamente.
- **Sugestao:** Adicionar parametro `force: true` que destroi a conexao existente e cria nova.

---

## BUG-002: scripts/test-integration.js truncado

- **Severidade:** Alta
- **Status:** Aberto
- **Componente:** `scripts/test-integration.js`
- **Descricao:** O arquivo `scripts/test-integration.js` esta incompleto/truncado. O codigo termina abruptamente no meio da secao de Export (variavel `claude` nao declarada por completo). Cascade delete e contagem de resultados ausentes.
- **Impacto:** Executar `npm test` falha com erro de sintaxe.
- **Reproducao:** Executar `node scripts/test-integration.js`.
- **Sugestao:** O novo `test/integration.test.js` substitui essa funcionalidade.

---

## BUG-003: Export sem tratamento de undefined em contextEntries/decisions

- **Severidade:** Baixa
- **Status:** Aberto
- **Componente:** `packages/core/src/export/index.ts`
- **Descricao:** Funcoes de export podem falhar se `project.contextEntries` ou `project.decisions` forem `undefined` (ao inves de array vazio).
- **Impacto:** `TypeError` se projeto carregado sem relations.
- **Sugestao:** Adicionar fallback: `const entries = project.contextEntries || [];`

---

## BUG-004: Servicos sem cobertura de testes

- **Severidade:** Media
- **Status:** Aberto
- **Componente:** `packages/core/src/services/`
- **Descricao:** Servicos sem testes: ChatHistoryService, AutoSyncService, FileWatcherService, SyncConfigService.
- **Impacto:** Regressoes silenciosas possiveis.
- **Sugestao:** Criar testes unitarios para cada servico faltante.

---

## BUG-005: Validacao Zod nao integrada nos Services

- **Severidade:** Media
- **Status:** Aberto
- **Componente:** `packages/core/src/services/ProjectService.ts`, `ContextService.ts`, `DecisionService.ts`
- **Descricao:** Os schemas Zod em `validation/schemas.ts` nao sao usados dentro dos services. Metodos `create`/`update` aceitam input sem validacao.
- **Impacto:** Dados invalidos podem ser persistidos (ex: nome com 1 char, priority > 4).
- **Reproducao:**
  1. `ps.create({ name: 'a' })` -- deveria falhar, nao falha.
  2. `cs.create({ projectId, key: 'k', value: 'v', priority: 99 })` -- deveria falhar, nao falha.
- **Sugestao:** Integrar `schema.parse(input)` nos metodos.

---

## BUG-006: Env var THINKCOFFEE_DB_PATH persiste entre execucoes

- **Severidade:** Baixa
- **Status:** Informativo
- **Componente:** `packages/core/src/database.ts`
- **Descricao:** Se `THINKCOFFEE_DB_PATH` for setado para testes (`:memory:`), pode afetar outros processos no mesmo shell.
- **Sugestao:** Documentar uso do parametro `dbPath` diretamente.

---

## Totais

| Severidade | Quantidade |
|-----------|-----------|
| Alta      | 1         |
| Media     | 3         |
| Baixa     | 2         |
| **Total** | **6**     |

---

*Relatorio gerado pelo Troubleshooter do time ThinkCoffee.*
