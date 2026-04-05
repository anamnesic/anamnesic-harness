# ThinkCoffee -- Sprint Plan: Pipeline History & Observability

> Feature: Pipeline History & Observability
> Versao: 2.0

---

## Sprint 1: Fundacao de Metricas e Historico

**Duracao estimada**: 7-12 dias
**Objetivo**: Capturar metricas de execucao, persistir historico, calcular custo.

### Tasks

| Task | Responsavel | Estimativa | Dependencia | Entregavel |
|---|---|---|---|---|
| S1-01: Criar tipo `TaskMetrics` em `pipeline.ts` | @backend | 0.5d | -- | Tipo TypeScript adicionado ao `AgentTask` |
| S1-02: Instrumentar `handleToolCall()` em `AgentService.ts` | @backend | 2d | S1-01 | Cada tool call incrementa metricas no objeto task |
| S1-03: Registrar metricas de modelo/preset na task | @backend | 0.5d | S1-01 | `metrics.model` e `metrics.preset` preenchidos |
| S1-04: Exibir resumo de metricas no chat ao fim de fase | @frontend | 1d | S1-02 | Mensagem formatada no chat |
| S1-05: Criar `PipelineHistoryService` | @backend | 3d | S1-01 | Servico com save/get/list/search |
| S1-06: Hook de save automatico ao completar/falhar pipeline | @backend | 1d | S1-05 | Historico salvo automaticamente |
| S1-07: Criar `CostTrackerService` | @backend | 1.5d | S1-01 | Servico com calculateTaskCost/calculatePipelineCost |
| S1-08: Integrar custo nas metricas e no historico | @backend | 0.5d | S1-07, S1-05 | Campo `costEstimate` preenchido |

### Definition of Done Sprint 1
- [ ] `TaskMetrics` existe como tipo em `pipeline.ts`
- [ ] Tool calls sao contabilizados por tipo no `AgentService`
- [ ] `PipelineHistoryService` salva e recupera historico
- [ ] `CostTrackerService` calcula custo corretamente
- [ ] Metricas e custo aparecem como resumo no chat
- [ ] Historico eh salvo automaticamente ao fim do pipeline

---

## Sprint 2: Interface e Protecao de Custo

**Duracao estimada**: 8-13 dias
**Objetivo**: Expor historico e custo para o usuario. Budget alerts.

### Tasks

| Task | Responsavel | Estimativa | Dependencia | Entregavel |
|---|---|---|---|---|
| S2-01: Comando `/history` no chat | @frontend | 2d | Sprint 1 | Lista de pipelines no chat |
| S2-02: Comando `/history <id>` com detalhes | @frontend | 1d | S2-01 | Detalhes do pipeline no chat |
| S2-03: Comando `think history` no CLI | @backend | 2d | Sprint 1 | Subcomando CLI funcional |
| S2-04: Budget config (VS Code settings + JSON) | @backend | 1d | -- | Schema de configuracao |
| S2-05: Budget check entre fases | @backend | 2d | S2-04, Sprint 1 | Pipeline pausa ao atingir budget |
| S2-06: Budget warning no chat | @frontend | 1d | S2-05 | Warning visual no chat |
| S2-07: Budget confirmation dialog | @frontend | 1d | S2-05 | Popup de confirmacao |
| S2-08: Testes PipelineHistoryService | @qa | 3d | Sprint 1 | >= 80% cobertura |
| S2-09: Testes CostTrackerService | @qa | 2d | Sprint 1 | >= 80% cobertura |
| S2-10: Testes pipeline metrics | @qa | 2d | Sprint 1 | >= 80% cobertura |

### Definition of Done Sprint 2
- [ ] `/history` funciona no chat do VS Code
- [ ] `think history` funciona no CLI
- [ ] Budget alerts funcionam com configuracao
- [ ] Pipeline pausa ao atingir budget maximo
- [ ] Testes de novos servicos com >= 80% cobertura
- [ ] `pnpm test` passa sem erros

---

## Sprint 3: Export e Comparacao

**Duracao estimada**: 5-8 dias
**Objetivo**: Export de historico e comparacao de pipelines.

### Tasks

| Task | Responsavel | Estimativa | Dependencia | Entregavel |
|---|---|---|---|---|
| S3-01: Export Markdown de historico | @backend | 1.5d | Sprint 1, Sprint 2 | `think history export --format md` |
| S3-02: Export JSON de historico | @backend | 0.5d | Sprint 1, Sprint 2 | `think history export --format json` |
| S3-03: Metodo `compare()` no HistoryService | @backend | 2d | Sprint 1 | Logica de comparacao |
| S3-04: Comando `/compare` no chat | @frontend | 2d | S3-03 | Tabela comparativa no chat |
| S3-05: Testes de export e comparison | @qa | 2d | S3-01, S3-03 | >= 80% cobertura |

### Definition of Done Sprint 3
- [ ] Export Markdown gera documento legivel
- [ ] Export JSON gera arquivo valido
- [ ] `/compare` mostra tabela comparativa
- [ ] Testes de export e comparison passam
- [ ] Feature completa entregue

---

## Resumo de Estimativas

| Sprint | Estimativa Total | Agentes Envolvidos |
|---|---|---|
| Sprint 1 | 7-12 dias | @backend (principal), @frontend (resumo no chat) |
| Sprint 2 | 8-13 dias | @backend, @frontend, @qa |
| Sprint 3 | 5-8 dias | @backend, @frontend, @qa |
| **Total** | **20-33 dias** | -- |

---

## Metricas de Sucesso da Feature

| Metrica | Meta | Como Medir |
|---|---|---|
| Historico salvo para 100% dos pipelines completados/falhos | 100% | Verificar existencia de arquivo em `~/.thinkcoffee/history/` |
| Metricas de tool calls precisas (delta < 5% vs real) | < 5% erro | Comparar contagem de tool calls com log de debug |
| Budget alert dispara dentro de 1 fase do threshold | 1 fase de tolerancia | Testar com budgets conhecidos |
| Cobertura de testes novos modulos | >= 80% | `vitest --coverage` |
| Tempo de consulta de historico (lista 100 pipelines) | < 500ms | Benchmark no CI |
