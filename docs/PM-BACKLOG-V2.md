# ThinkCoffee -- Product Backlog V2: Pipeline History & Observability

> Gerado pelo agente Product Manager | Pipeline: "defina uma nova feature"
> Data: 2025-01-01
> Versao: 2.0

---

## 1. Analise do Estado Atual

### O que foi implementado desde o Backlog V1

| Item do Backlog V1 | Status | Evidencia |
|---|---|---|
| REQ-04: Command Validator (guardrails) | Implementado | `packages/core/src/guardrails/command-validator.ts` -- valida comandos shell, bloqueia padroes perigosos, classifica risco |
| REQ-07: Suite de testes unitarios | Implementado | `__tests__/` em pipeline, chat, services, export, validation -- cobertura existente |
| Pipeline multi-agente com tools (read/write/list/search/run) | Implementado | `packages/vscode/src/agents/AgentService.ts` -- tool calls com path traversal protection |
| PM planeja fases dinamicamente | Implementado | `planPhases()`, `selectMode()`, `autoAssignModels()` no AgentService |
| Quality Presets (cafe-soluvel, coado-com-carinho, espresso-duplo) | Implementado | `packages/core/src/agent-config.ts` |
| Model failure tracking | Implementado | `recordModelFailure()`, `getModelFailureCounts()` |
| Auto-sync (on-change, scheduled, manual) | Implementado | `AutoSyncService`, `SyncConfigService` |

### O que ainda NAO foi implementado do Backlog V1

| Item do Backlog V1 | Status | Motivo |
|---|---|---|
| REQ-01: Dry-Run Mode | NAO implementado | AgentService executa tools diretamente, sem flag dry-run |
| REQ-02: Snapshot antes de execucao | NAO implementado | Nenhum SnapshotService existe |
| REQ-03: Comando de Rollback | NAO implementado | Depende do snapshot |
| REQ-05: Diff Preview antes de write_file | NAO implementado | write_file grava direto sem preview |
| REQ-06: Metricas de execucao de agentes | NAO implementado | Nenhum tracking de tempo/tokens/tool calls por task |

### Lacunas novas identificadas

| Lacuna | Impacto | Prioridade |
|---|---|---|
| Pipeline nao persiste historico consultavel entre sessoes | Alto -- perde aprendizados, repete erros | Alta |
| Sem metricas de execucao (tempo, tokens, tool calls, custo) | Alto -- sem visibilidade de custo/eficiencia | Alta |
| Sem dashboard agregado de pipelines no VS Code | Medio -- dificil ver progresso historico | Media |
| Sem export de historico de pipeline para Markdown/JSON | Medio -- nao integra com docs | Media |
| Sem alertas/limites de custo por pipeline | Medio -- risco financeiro com presets caros | Media |
| Agent output nao indexado para busca semantica | Baixo -- busca existe mas eh textual | Baixa |

---

## 2. Feature Principal: Pipeline History & Observability

### Justificativa

O pipeline multi-agente ja funciona: PM planeja fases, agentes executam com tools, outputs sao gerados. Porem, apos a sessao terminar, nao ha forma estruturada de:

1. **Consultar o que cada agente fez** em pipelines anteriores
2. **Medir custo e eficiencia** de cada execucao (tempo, tool calls, erros)
3. **Comparar pipelines** para aprender quais presets/modelos funcionaram melhor
4. **Exportar historico** para documentacao ou auditoria

Isso eh critico porque o produto usa modelos de IA com custo variavel (0x a 3x por request). Sem observabilidade, o usuario nao sabe se esta gastando bem ou mal. Alem disso, o historico de decisoes de agentes eh valioso para onboarding de novos membros e para evitar retrabalho.

---

## 3. Requisitos Estruturados

### REQ-01: Pipeline Execution Metrics

**Descricao**: Capturar e persistir metricas de execucao para cada task de cada fase do pipeline. Registrar: tempo de inicio/fim, duracao, quantidade de tool calls por tipo, arquivos criados/modificados/lidos, erros, modelo utilizado, preset ativo.

**Modulos afetados**: `packages/core/pipeline.ts`, `packages/vscode/src/agents/AgentService.ts`

| Campo | Detalhe |
|---|---|
| Tipo | Funcional |
| Prioridade | P0 -- Critica |
| Estimativa | M (3-5 dias) |
| Dependencias | Nenhuma |

### REQ-02: Pipeline History Store

**Descricao**: Ao completar (ou falhar) um pipeline, salvar um registro consolidado em `~/.thinkcoffee/history/<projectId>/`. O registro inclui: objetivo, fases, tasks com outputs resumidos, metricas, preset usado, modelos por agente, resultado final, timestamps. Formato: JSON indexavel.

**Modulos afetados**: `packages/core/pipeline.ts`, novo `packages/core/src/services/PipelineHistoryService.ts`

| Campo | Detalhe |
|---|---|
| Tipo | Funcional |
| Prioridade | P0 -- Critica |
| Estimativa | M (3-5 dias) |
| Dependencias | REQ-01 |

### REQ-03: Comando `/history` no Chat e CLI

**Descricao**: Implementar comando `/history` no chat do VS Code e `think history [projectId]` no CLI que lista pipelines anteriores com: data, objetivo, status, preset, duracao total, quantidade de fases/tasks. Com flag `--detail <pipelineId>` mostra output completo.

**Modulos afetados**: `packages/cli/src/commands/`, `packages/vscode/src/chat/`, `packages/core/src/services/PipelineHistoryService.ts`

| Campo | Detalhe |
|---|---|
| Tipo | Funcional |
| Prioridade | P0 -- Critica |
| Estimativa | M (3-5 dias) |
| Dependencias | REQ-02 |

### REQ-04: Pipeline Cost Tracker

**Descricao**: Calcular custo estimado de cada pipeline baseado nos modelos usados (cost multiplier de cada model no `AVAILABLE_MODELS`). Exibir resumo de custo ao fim de cada fase e ao fim do pipeline. Persistir junto com o historico.

**Modulos afetados**: `packages/core/src/agent-config.ts`, novo `packages/core/src/services/CostTrackerService.ts`

| Campo | Detalhe |
|---|---|
| Tipo | Funcional |
| Prioridade | P1 -- Alta |
| Estimativa | S (1-2 dias) |
| Dependencias | REQ-01 |

### REQ-05: Cost Budget & Alerts

**Descricao**: Permitir configurar um budget maximo por pipeline (em unidades de cost multiplier). Quando 80% do budget for atingido, exibir warning no chat. Quando 100% for atingido, pausar o pipeline e pedir confirmacao para continuar. Configuravel via `thinkcoffee.costBudget` no VS Code settings e `~/.thinkcoffee/budget.json`.

**Modulos afetados**: `packages/vscode/`, `packages/core/`

| Campo | Detalhe |
|---|---|
| Tipo | Funcional |
| Prioridade | P1 -- Alta |
| Estimativa | M (3-5 dias) |
| Dependencias | REQ-04 |

### REQ-06: Pipeline History Export

**Descricao**: Exportar historico de pipeline em formato Markdown legivel e JSON estruturado. O Markdown deve ser adequado para incluir em documentacao de projeto (changelog, ADRs). Comando: `think history export <pipelineId> --format md|json`.

**Modulos afetados**: `packages/core/src/export/`, `packages/cli/src/commands/`

| Campo | Detalhe |
|---|---|
| Tipo | Funcional |
| Prioridade | P2 -- Media |
| Estimativa | S (1-2 dias) |
| Dependencias | REQ-02 |

### REQ-07: Pipeline Comparison View

**Descricao**: Comando `/compare` no chat que compara dois pipelines lado a lado: metricas, custo, modelos usados, tempo por fase. Util para avaliar se trocar de preset melhorou ou piorou resultados.

**Modulos afetados**: `packages/core/src/services/PipelineHistoryService.ts`, `packages/vscode/src/chat/`

| Campo | Detalhe |
|---|---|
| Tipo | Funcional |
| Prioridade | P2 -- Media |
| Estimativa | M (3-5 dias) |
| Dependencias | REQ-02, REQ-04 |

### REQ-08: Testes para novos modulos

**Descricao**: Cobertura minima de 80% para todos os novos servicos (`PipelineHistoryService`, `CostTrackerService`, pipeline metrics). Testes devem usar mocks de filesystem (sem I/O real). Incluir testes de integracao para o fluxo completo: pipeline executa -> metricas coletadas -> historico salvo -> historico consultado.

**Modulos afetados**: `packages/core/src/__tests__/`, `packages/core/src/services/__tests__/`

| Campo | Detalhe |
|---|---|
| Tipo | Nao-funcional (Qualidade) |
| Prioridade | P1 -- Alta |
| Estimativa | L (5-8 dias) |
| Dependencias | REQ-01, REQ-02, REQ-04 |

---

## 4. Criterios de Aceite

### REQ-01: Pipeline Execution Metrics

- [ ] Cada task do pipeline registra `startedAt`, `completedAt`, `durationMs`
- [ ] Cada tool call do agente eh contabilizado por tipo (`read_file`, `write_file`, `list_files`, `search_code`, `run_command`, `mention_agent`)
- [ ] Metricas incluem: `filesRead`, `filesWritten`, `filesListed`, `searchesExecuted`, `commandsRun`, `mentionsMade`
- [ ] Metricas incluem: `model` (family usada), `preset` ativo no momento da execucao
- [ ] Metricas incluem: `errors` (lista de erros com timestamp e mensagem)
- [ ] Metricas sao acessiveis via `pipeline.phases[n].tasks[n].metrics`
- [ ] Metricas sao persistidas junto com o pipeline JSON em `~/.thinkcoffee/pipelines/`
- [ ] Teste unitario: metricas incrementam corretamente ao simular tool calls

### REQ-02: Pipeline History Store

- [ ] Ao completar/falhar um pipeline, um arquivo `~/.thinkcoffee/history/<projectId>/<pipelineId>.json` eh criado
- [ ] O registro inclui: `id`, `projectId`, `objective`, `status`, `preset`, `totalDurationMs`, `totalCost`, `phases` (resumidas), `createdAt`, `completedAt`
- [ ] Outputs de agentes sao incluidos com limite de 5000 caracteres por task (truncados)
- [ ] `PipelineHistoryService` tem metodos: `save(pipeline)`, `get(projectId, pipelineId)`, `list(projectId)`, `search(projectId, query)`
- [ ] Lista retorna resultados ordenados por data (mais recente primeiro)
- [ ] Teste unitario: salvar e recuperar historico funciona corretamente

### REQ-03: Comando /history

- [ ] `/history` no chat lista ultimos 10 pipelines do projeto ativo com: data, objetivo (truncado 50 chars), status, preset, duracao, custo
- [ ] `/history <pipelineId>` mostra detalhes completos do pipeline
- [ ] `think history` no CLI lista pipelines do projeto ativo
- [ ] `think history --project <id>` lista de projeto especifico
- [ ] `think history --detail <pipelineId>` mostra detalhes completos
- [ ] Output formatado em tabela legivel (CLI) e markdown (chat)
- [ ] Teste unitario: formatacao de output esta correta

### REQ-04: Pipeline Cost Tracker

- [ ] `CostTrackerService.calculateTaskCost(model, durationMs)` retorna custo estimado em unidades de cost multiplier
- [ ] `CostTrackerService.calculatePipelineCost(pipeline)` retorna custo total do pipeline
- [ ] Custo eh calculado como: `costMultiplier * numberOfToolCalls` (aproximacao simples)
- [ ] Resumo de custo exibido no chat ao fim de cada fase: "Fase [name]: custo estimado X.Xx (modelo1: Ax, modelo2: Bx)"
- [ ] Resumo total exibido ao fim do pipeline
- [ ] Custo salvo no historico do pipeline
- [ ] Teste unitario: calculo de custo para cada modelo/preset esta correto

### REQ-05: Cost Budget & Alerts

- [ ] Configuracao `thinkcoffee.costBudget` aceita valor numerico (unidades de cost multiplier)
- [ ] Configuracao tambem aceitavel via `~/.thinkcoffee/budget.json`: `{ "maxCostPerPipeline": 50, "warningThreshold": 0.8 }`
- [ ] Warning no chat quando custo acumulado atinge `warningThreshold * maxCost`
- [ ] Pipeline pausa quando custo atinge `maxCost`, com prompt: "Budget atingido (Xx de Yx). Continuar? [Sim/Nao]"
- [ ] Se usuario confirma, pipeline continua sem restricao ate o fim
- [ ] Se usuario recusa, pipeline eh marcado como `failed` com motivo "budget-exceeded"
- [ ] Teste unitario: alertas disparam nos thresholds corretos

### REQ-06: Pipeline History Export

- [ ] `think history export <pipelineId> --format md` gera Markdown com: titulo, objetivo, fases, outputs resumidos, metricas, custo
- [ ] `think history export <pipelineId> --format json` gera JSON completo
- [ ] Markdown segue formato ADR-like: contexto, decisao, consequencias
- [ ] Arquivo salvo em `<workspace>/docs/pipeline-history-<pipelineId>.md|json`
- [ ] Teste unitario: export gera formato correto

### REQ-07: Pipeline Comparison View

- [ ] `/compare <pipelineId1> <pipelineId2>` no chat mostra tabela comparativa
- [ ] Colunas: fase, duracao pipeline1 vs pipeline2, custo pipeline1 vs pipeline2, modelos usados
- [ ] Destaque visual (texto) para o pipeline mais eficiente em cada metrica
- [ ] Resumo final: "Pipeline A foi X% mais rapido e Yx mais barato"
- [ ] Teste unitario: comparacao calcula diferencas corretamente

### REQ-08: Testes para novos modulos

- [ ] `PipelineHistoryService.test.ts` com >= 80% cobertura
- [ ] `CostTrackerService.test.ts` com >= 80% cobertura
- [ ] `pipeline-metrics.test.ts` com >= 80% cobertura
- [ ] Teste de integracao: fluxo completo pipeline -> metrics -> history -> query
- [ ] Todos os testes usam mocks de filesystem (vi.mock('fs'))
- [ ] `pnpm test` passa sem erros
- [ ] Nenhum teste depende de rede ou I/O real

---

## 5. User Stories

### US-01: Metricas de execucao por agente
**Como** tech lead,
**quero** ver metricas detalhadas de cada agente (tempo, tool calls, erros, modelo),
**para que** eu possa avaliar a eficiencia de cada agente e identificar gargalos.

**Criterios**: REQ-01

### US-02: Historico consultavel de pipelines
**Como** desenvolvedor,
**quero** consultar o historico de pipelines executados no meu projeto,
**para que** eu possa aprender com execucoes anteriores e nao repetir erros.

**Criterios**: REQ-02, REQ-03

### US-03: Visibilidade de custo por pipeline
**Como** gestor de equipe,
**quero** saber quanto cada pipeline custou em termos de premium requests,
**para que** eu possa tomar decisoes informadas sobre qual preset usar.

**Criterios**: REQ-04

### US-04: Limite de gastos por pipeline
**Como** desenvolvedor individual,
**quero** definir um budget maximo por pipeline e ser alertado quando estou perto do limite,
**para que** eu nao gaste mais do que posso com modelos premium acidentalmente.

**Criterios**: REQ-05

### US-05: Exportar historico para documentacao
**Como** desenvolvedor,
**quero** exportar o historico de um pipeline como Markdown,
**para que** eu possa incluir as decisoes e outputs dos agentes na documentacao do projeto.

**Criterios**: REQ-06

### US-06: Comparar eficiencia entre pipelines
**Como** tech lead,
**quero** comparar dois pipelines lado a lado (metricas, custo, modelos),
**para que** eu possa avaliar se mudar de preset ou modelo melhorou os resultados.

**Criterios**: REQ-07

### US-07: Confianca na qualidade dos novos modulos
**Como** contribuidor do projeto,
**quero** que todos os novos servicos tenham testes com cobertura >= 80%,
**para que** eu possa fazer refactoring e adicionar features com confianca.

**Criterios**: REQ-08

---

## 6. Backlog Priorizado

| # | ID | User Story | Prioridade | Estimativa | Sprint | Agentes |
|---|---|---|---|---|---|---|
| 1 | REQ-01 | US-01 -- Metricas de execucao | P0 | M (3-5d) | Sprint 1 | @backend |
| 2 | REQ-02 | US-02 -- Pipeline History Store | P0 | M (3-5d) | Sprint 1 | @backend |
| 3 | REQ-04 | US-03 -- Cost Tracker | P1 | S (1-2d) | Sprint 1 | @backend |
| 4 | REQ-03 | US-02 -- Comando /history | P0 | M (3-5d) | Sprint 2 | @backend, @frontend |
| 5 | REQ-05 | US-04 -- Cost Budget & Alerts | P1 | M (3-5d) | Sprint 2 | @backend, @frontend |
| 6 | REQ-08 | US-07 -- Testes novos modulos | P1 | L (5-8d) | Sprint 2 | @qa |
| 7 | REQ-06 | US-05 -- History Export | P2 | S (1-2d) | Sprint 3 | @backend |
| 8 | REQ-07 | US-06 -- Pipeline Comparison | P2 | M (3-5d) | Sprint 3 | @backend, @frontend |

### Justificativa da ordenacao

1. **Metricas (REQ-01)** vem primeiro porque eh a base de dados que tudo mais consome. Sem metricas, nao ha historico util nem custo calculavel. Alteracao eh localizada: adicionar um objeto `metrics` no `AgentTask` e instrumentar o `handleToolCall` no `AgentService`.

2. **History Store (REQ-02)** depende diretamente das metricas para gerar registros uteis. Eh um servico novo mas simples (leitura/escrita de JSON em filesystem, seguindo o padrao ja existente de `pipelines/`).

3. **Cost Tracker (REQ-04)** eh pequeno (1-2 dias) e aproveita os dados de metricas ja existentes + o mapa de `AVAILABLE_MODELS` com cost multipliers que ja existe em `agent-config.ts`. Pode entrar na Sprint 1 sem sobrecarregar.

4. **Comando /history (REQ-03)** eh a interface do usuario para consumir o historico. Precisa do store pronto. Vai na Sprint 2 junto com budget/alerts porque ambos sao UX features.

5. **Cost Budget (REQ-05)** depende do cost tracker. Eh P1 porque evita gasto acidental -- relevante para usuarios individuais com Copilot Pro.

6. **Testes (REQ-08)** rodam em paralelo com Sprint 2 features. O QA pode comecar a testar REQ-01, REQ-02 e REQ-04 assim que Sprint 1 terminar.

7. **Export e Comparison (REQ-06, REQ-07)** sao nice-to-have. Ficam para Sprint 3.

---

## 7. Especificacao Tecnica Preliminar

### 7.1 Estrutura de Metricas (REQ-01)

```typescript
// Adicionar ao AgentTask em packages/core/src/pipeline.ts

export interface TaskMetrics {
  model: string;                    // family do modelo usado
  preset: string;                   // preset ativo (cafe-soluvel, etc)
  durationMs: number;               // completedAt - startedAt
  toolCalls: {
    read_file: number;
    write_file: number;
    list_files: number;
    search_code: number;
    run_command: number;
    mention_agent: number;
    total: number;
  };
  filesRead: string[];              // paths lidos
  filesWritten: string[];           // paths escritos
  errors: Array<{
    timestamp: string;
    tool: string;
    message: string;
  }>;
  costEstimate: number;             // cost multiplier units
}

// Extensao do AgentTask existente
export interface AgentTask {
  // ... campos existentes ...
  metrics?: TaskMetrics;
}
```

### 7.2 Pipeline History Record (REQ-02)

```typescript
// Novo arquivo: packages/core/src/services/PipelineHistoryService.ts

export interface PipelineHistoryRecord {
  id: string;                       // mesmo id do pipeline
  projectId: string;
  objective: string;
  status: PipelineStatus;
  preset: string;
  modelsUsed: Record<AgentRole, string>;
  totalDurationMs: number;
  totalCost: number;
  phases: Array<{
    name: string;
    status: PhaseStatus;
    durationMs: number;
    cost: number;
    tasks: Array<{
      agent: AgentRole;
      title: string;
      status: TaskStatus;
      output: string;              // truncado a 5000 chars
      metrics: TaskMetrics;
    }>;
  }>;
  createdAt: string;
  completedAt: string;
}
```

### 7.3 Cost Tracker (REQ-04)

```typescript
// Novo arquivo: packages/core/src/services/CostTrackerService.ts

export class CostTrackerService {
  /**
   * Calcula custo de uma task baseado no modelo e tool calls.
   * Formula: costMultiplier * totalToolCalls
   * (Cada tool call consome ~1 request do Copilot)
   */
  calculateTaskCost(model: string, toolCalls: number): number;

  /**
   * Calcula custo total do pipeline somando custos de todas as tasks.
   */
  calculatePipelineCost(pipeline: Pipeline): number;

  /**
   * Formata custo para exibicao humana.
   * Ex: "12.5x (equivale a ~13 premium requests)"
   */
  formatCost(cost: number): string;
}
```

### 7.4 Armazenamento

| Dado | Local | Formato |
|---|---|---|
| Pipeline ativo (com metricas) | `~/.thinkcoffee/pipelines/<projectId>/<pipelineId>.json` | JSON (ja existe) |
| Historico consolidado | `~/.thinkcoffee/history/<projectId>/<pipelineId>.json` | JSON (novo) |
| Budget config | `~/.thinkcoffee/budget.json` | JSON (novo) |

Segue o padrao ja existente de armazenamento em filesystem local (`~/.thinkcoffee/`). Nao usa SQLite para estes dados porque sao append-mostly e podem ficar grandes.

---

## 8. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| Metricas de tool calls imprecisas (contagem nao bate com Copilot real) | Media | Baixo | Documentar que eh estimativa; usar como referencia relativa, nao absoluta |
| Historico cresce indefinidamente | Media | Medio | Garbage collector: apagar historicos com > 90 dias; limite de 100 por projeto |
| Budget interrompe pipeline no meio de execucao de agente | Baixa | Alto | Verificar budget ENTRE fases (nao no meio de uma task) |
| Performance de leitura de historico com muitos arquivos JSON | Baixa | Medio | Criar indice leve (`~/.thinkcoffee/history/<projectId>/index.json`) com metadados resumidos |

---

## 9. Proximos Passos

1. **@architect**: Detalhar a arquitetura tecnica dos servicos `PipelineHistoryService`, `CostTrackerService`, e a instrumentacao de metricas no `AgentService`
2. **@backend**: Implementar `TaskMetrics` no `pipeline.ts` e criar `PipelineHistoryService` e `CostTrackerService`
3. **@frontend**: Implementar os comandos `/history` e `/compare` no chat do VS Code, e o UI de budget alerts
4. **@qa**: Escrever testes para os novos servicos assim que Sprint 1 for finalizada
5. **@devops**: Verificar se o pipeline de CI precisa de ajustes para rodar os novos testes

---

## 10. Referencia: Backlog V1 Pendente (Carry-Over)

Os seguintes itens do Backlog V1 continuam pendentes e devem ser endereados nas sprints seguintes (Sprint 4+):

| ID V1 | Item | Prioridade Original |
|---|---|---|
| REQ-01 | Dry-Run Mode | P0 |
| REQ-02 | Snapshot antes de execucao | P0 |
| REQ-03 | Comando de Rollback | P0 |
| REQ-05 | Diff Preview antes de write_file | P1 |

Estes itens permanecem relevantes e serao priorizados apos a feature de observabilidade estar completa, pois a observabilidade dara visibilidade sobre quais tipos de erros de agentes sao mais comuns, informando melhor o design do sistema de rollback.
