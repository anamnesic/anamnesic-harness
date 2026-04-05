# ThinkCoffee -- User Stories: Pipeline History & Observability

> Feature: Pipeline History & Observability
> Versao: 2.0

---

## US-01: Metricas de execucao por agente

**Como** tech lead,
**quero** ver metricas detalhadas de cada agente (tempo, tool calls, erros, modelo usado),
**para que** eu possa avaliar a eficiencia de cada agente e identificar gargalos no pipeline.

### Cenarios de aceite

**Cenario 1: Metricas basicas registradas**
- Dado que um agente esta executando uma task no pipeline
- Quando o agente faz tool calls (read_file, write_file, etc.)
- Entao cada tool call eh contabilizado no objeto `metrics` da task
- E o tempo total de duracao eh calculado como `completedAt - startedAt` em milissegundos

**Cenario 2: Modelo e preset registrados**
- Dado que o pipeline esta usando o preset "coado-com-carinho"
- Quando o agente de backend inicia sua task
- Entao `metrics.model` registra "gpt-5.3-codex"
- E `metrics.preset` registra "coado-com-carinho"

**Cenario 3: Erros de tool calls registrados**
- Dado que um agente tenta ler um arquivo que nao existe
- Quando `read_file` retorna erro
- Entao o erro eh adicionado a `metrics.errors` com timestamp e mensagem
- E `metrics.toolCalls.read_file` ainda eh incrementado (contabiliza tentativa)

**Cenario 4: Resumo no chat**
- Dado que todos os agentes de uma fase completaram suas tasks
- Quando a fase muda para "awaiting-approval"
- Entao o chat exibe resumo: "[Phase name] completa. Backend: 45s, 12 tool calls, 3 arquivos escritos."

### Notas tecnicas
- Instrumentar `handleToolCall()` em `AgentService.ts`
- Adicionar `TaskMetrics` ao tipo `AgentTask` em `pipeline.ts`
- Metricas persistidas no pipeline JSON existente (nao cria arquivo novo)

---

## US-02: Historico consultavel de pipelines

**Como** desenvolvedor,
**quero** consultar o historico de pipelines executados no meu projeto,
**para que** eu possa aprender com execucoes anteriores e evitar repetir erros.

### Cenarios de aceite

**Cenario 1: Historico salvo automaticamente**
- Dado que um pipeline foi completado (status "completed")
- Quando o pipeline eh finalizado
- Entao um arquivo `~/.thinkcoffee/history/<projectId>/<pipelineId>.json` eh criado
- E o arquivo contem todos os dados do pipeline com outputs truncados a 5000 chars

**Cenario 2: Historico salvo em falha**
- Dado que um pipeline falhou (status "failed")
- Quando o pipeline eh marcado como falho
- Entao o historico tambem eh salvo com status "failed"
- E os outputs ate o ponto da falha sao preservados

**Cenario 3: Consulta via chat**
- Dado que existem 15 pipelines no historico do projeto "thinkcoffee"
- Quando o usuario digita `/history` no chat
- Entao os 10 pipelines mais recentes sao listados em formato tabela
- E cada item mostra: data, objetivo (max 50 chars), status, preset, duracao

**Cenario 4: Detalhes via chat**
- Dado que o usuario quer ver detalhes do pipeline "abc-123"
- Quando o usuario digita `/history abc-123`
- Entao o chat mostra: objetivo completo, todas as fases, tasks com outputs, metricas, custo

**Cenario 5: Consulta via CLI**
- Dado que o usuario esta no terminal
- Quando digita `think history`
- Entao a lista de pipelines eh exibida em formato tabela ASCII
- E `think history --detail abc-123` mostra detalhes completos

**Cenario 6: Busca no historico**
- Dado que o usuario quer encontrar pipelines sobre "autenticacao"
- Quando digita `think history --search "autenticacao"`
- Entao retorna pipelines cujo objetivo contem "autenticacao"

### Notas tecnicas
- Novo servico: `PipelineHistoryService` em `packages/core/src/services/`
- Metodos: `save()`, `get()`, `list()`, `search()`
- Seguir padrao de filesystem storage ja existente em `PipelineService`
- Indexar metadados em `index.json` para listar sem ler todos os arquivos

---

## US-03: Visibilidade de custo por pipeline

**Como** gestor de equipe,
**quero** saber quanto cada pipeline custou em termos de premium requests,
**para que** eu possa tomar decisoes informadas sobre qual preset usar.

### Cenarios de aceite

**Cenario 1: Custo por task calculado**
- Dado que o agente "backend" usou modelo "gpt-5.4" (3x) e fez 10 tool calls
- Quando a task eh completada
- Entao `metrics.costEstimate` = 30 (3 * 10)

**Cenario 2: Custo por fase exibido**
- Dado que a fase "Implementation" tem 3 agentes com custos 30, 15, e 9
- Quando a fase eh completada
- Entao o chat mostra: "Fase Implementation: custo estimado 54x (backend: 30x, frontend: 15x, devops: 9x)"

**Cenario 3: Custo total do pipeline**
- Dado que um pipeline espresso-duplo completou com 5 fases
- Quando o pipeline eh finalizado
- Entao o chat mostra resumo: "Pipeline completo. Custo total: 120x (~120 premium requests). Duracao: 15min."

**Cenario 4: Custo zero para modelos gratuitos**
- Dado que o pipeline usa preset "cafe-soluvel" (custo 0x)
- Quando tasks completam
- Entao custo eh 0 para todas as tasks
- E resumo mostra: "Pipeline completo. Custo total: 0x (todos modelos gratuitos)"

### Notas tecnicas
- Novo servico: `CostTrackerService` em `packages/core/src/services/`
- Usa `getModelCost()` de `agent-config.ts` (ja existe)
- Formula: `costMultiplier * totalToolCalls`
- Custo salvo em `TaskMetrics.costEstimate` e no historico

---

## US-04: Limite de gastos por pipeline

**Como** desenvolvedor individual,
**quero** definir um budget maximo por pipeline e ser alertado quando estou perto do limite,
**para que** eu nao gaste mais do que posso com modelos premium acidentalmente.

### Cenarios de aceite

**Cenario 1: Configuracao via VS Code settings**
- Dado que o usuario configura `thinkcoffee.costBudget: 50`
- Quando um pipeline eh criado
- Entao o budget maximo eh 50 unidades de cost multiplier
- E o threshold de warning eh 80% (40 unidades) por padrao

**Cenario 2: Configuracao via arquivo**
- Dado que existe `~/.thinkcoffee/budget.json` com `{"maxCostPerPipeline": 100, "warningThreshold": 0.9}`
- Quando um pipeline eh criado
- Entao o budget maximo eh 100 unidades
- E o warning dispara a 90% (90 unidades)

**Cenario 3: Warning no chat**
- Dado que o budget eh 50 e o custo acumulado atingiu 40 (80%)
- Quando a proxima fase vai comecar
- Entao o chat exibe: "AVISO: Custo acumulado 40x de 50x (80% do budget). Restam ~10x."
- E o pipeline continua normalmente

**Cenario 4: Pipeline pausa ao atingir budget**
- Dado que o custo acumulado atingiu 50 (100% do budget)
- Quando a proxima fase vai comecar
- Entao o pipeline pausa
- E o chat exibe: "Budget atingido: 50x de 50x. Deseja continuar sem limite? [Sim/Nao]"

**Cenario 5: Usuario confirma continuar**
- Dado que o pipeline pausou por budget
- Quando o usuario responde "Sim"
- Entao o pipeline continua sem restricao ate o fim
- E um flag `budgetOverridden: true` eh salvo no pipeline

**Cenario 6: Usuario recusa continuar**
- Dado que o pipeline pausou por budget
- Quando o usuario responde "Nao"
- Entao o pipeline eh marcado como "failed" com motivo "budget-exceeded"
- E o historico registra o motivo

**Cenario 7: Sem budget configurado**
- Dado que nao existe configuracao de budget
- Quando um pipeline roda
- Entao nenhuma verificacao de custo eh feita
- E nenhum warning eh exibido

### Notas tecnicas
- Verificar budget ENTRE fases (nao no meio de uma task de agente)
- VS Code setting: `thinkcoffee.costBudget` (number, optional)
- Fallback: `~/.thinkcoffee/budget.json`
- Se ambos existem, VS Code setting tem prioridade

---

## US-05: Exportar historico para documentacao

**Como** desenvolvedor,
**quero** exportar o historico de um pipeline como Markdown,
**para que** eu possa incluir as decisoes e outputs dos agentes na documentacao do projeto.

### Cenarios de aceite

**Cenario 1: Export Markdown**
- Dado que o pipeline "abc-123" esta no historico
- Quando o usuario executa `think history export abc-123 --format md`
- Entao um arquivo `docs/pipeline-history-abc-123.md` eh criado no workspace
- E contem: titulo, objetivo, fases com outputs, metricas, custo total

**Cenario 2: Export JSON**
- Dado que o pipeline "abc-123" esta no historico
- Quando o usuario executa `think history export abc-123 --format json`
- Entao um arquivo `docs/pipeline-history-abc-123.json` eh criado no workspace
- E contem o registro completo do historico

**Cenario 3: Markdown legivel**
- Dado que o export Markdown foi gerado
- Quando aberto no VS Code ou GitHub
- Entao o documento tem: headers hierarquicos, tabelas de metricas, blocos de codigo para outputs tecnicos
- E segue formato similar a um ADR (context, decision, consequences)

### Notas tecnicas
- Reutilizar padrao de export de `packages/core/src/export/index.ts`
- Adicionar novos formatos: `pipeline-history-md`, `pipeline-history-json`
- CLI: novo subcomando `think history export`

---

## US-06: Comparar eficiencia entre pipelines

**Como** tech lead,
**quero** comparar dois pipelines lado a lado (metricas, custo, modelos),
**para que** eu possa avaliar se mudar de preset ou modelo melhorou os resultados.

### Cenarios de aceite

**Cenario 1: Comparacao basica**
- Dado que existem pipelines "abc" (espresso-duplo) e "def" (coado-com-carinho)
- Quando o usuario digita `/compare abc def` no chat
- Entao uma tabela comparativa eh exibida com: fase, duracao P1 vs P2, custo P1 vs P2

**Cenario 2: Resumo de eficiencia**
- Dado que pipeline "abc" custou 120x em 15min e "def" custou 45x em 22min
- Quando a comparacao eh exibida
- Entao o resumo mostra: "Pipeline def: 62.5% mais barato, porem 46.7% mais lento."

**Cenario 3: Modelos por agente**
- Dado que os dois pipelines usaram modelos diferentes para backend
- Quando a comparacao eh exibida
- Entao uma tabela mostra: agente, modelo P1, modelo P2, custo P1, custo P2

**Cenario 4: Pipelines incompativeis**
- Dado que pipeline "abc" tem 5 fases e "def" tem 3 fases
- Quando a comparacao eh exibida
- Entao fases comuns sao comparadas
- E fases extras sao listadas separadamente com nota "presente apenas em P1/P2"

### Notas tecnicas
- Metodo em `PipelineHistoryService`: `compare(record1, record2)`
- Retorna objeto estruturado com diffs por fase e totais
- ChatViewProvider formata em tabela Markdown

---

## US-07: Testes dos novos modulos

**Como** contribuidor do projeto,
**quero** que todos os novos servicos tenham testes com cobertura >= 80%,
**para que** eu possa fazer refactoring e adicionar features futuras com confianca.

### Cenarios de aceite

**Cenario 1: PipelineHistoryService testado**
- Dado que `PipelineHistoryService` tem metodos save, get, list, search
- Quando testes rodam
- Entao todos os metodos sao testados com mocks de filesystem
- E cobertura >= 80%

**Cenario 2: CostTrackerService testado**
- Dado que `CostTrackerService` calcula custos
- Quando testes rodam
- Entao calculo de custo eh testado para cada modelo em `AVAILABLE_MODELS`
- E edge cases (modelo desconhecido, zero tool calls) sao cobertos

**Cenario 3: Metricas incrementam corretamente**
- Dado que tool calls sao simulados
- Quando metricas sao coletadas
- Entao contagens batem com o numero de tool calls simulados
- E erros sao registrados na lista de erros

**Cenario 4: Integracao completa**
- Dado que um pipeline simulado roda do inicio ao fim
- Quando metricas -> historico -> consulta
- Entao os dados sao consistentes em todas as etapas

**Cenario 5: CI green**
- Dado que `pnpm test` eh executado
- Quando todos os testes rodam
- Entao exit code eh 0
- E nenhum teste usa rede ou filesystem real

### Notas tecnicas
- Seguir padrao ja existente em `__tests__/pipeline.test.ts` e `__tests__/chat.test.ts`
- Usar `vi.mock('fs')` e `vi.mock('os')` para mocks
- Novos arquivos de teste em `packages/core/src/services/__tests__/`
