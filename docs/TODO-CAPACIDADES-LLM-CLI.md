# TODO - Implementar Capacidades do README com Gemini CLI (e espaco para outras CLIs)

## Objetivo

Implementar as capacidades centrais do README usando `gemini-cli` como backend primario de inferencia em segundo plano, sem acoplar o sistema exclusivamente a ele.

Meta de arquitetura:

- `gemini-cli` primeiro;
- compatibilidade estrutural com `claude`, `copilot` e futuras CLIs;
- reuse da base existente de memoria, observacao, recall, politicas e terminal.

---

## Fase 0 - Fundacao de Abstracao de CLI

### Arquitetura

- [x] Criar pasta `src/core/llm-cli/`
- [x] Criar interface `LlmCliAdapter`
- [x] Criar `GeminiCliAdapter`
- [x] Criar `ClaudeCliAdapter`
- [x] Criar `CopilotCliAdapter`
- [x] Criar `LlmCliRegistry`
- [x] Criar `CliInferenceService`
- [x] Criar `CliResultNormalizer`
- [x] Criar `CliTaskQueue` para execucao em background
- [x] Criar `CliExecutionPolicy` para timeout, retries e aprovacao

### Comportamento

- [x] Suportar execucao normal e stream
- [x] Normalizar `stdout`, `stderr`, `exitCode` e `rawText`
- [x] Adicionar timeout por task
- [x] Adicionar retry com backoff
- [x] Adicionar telemetry por provider/latencia/erro
- [x] Adicionar fallback de provider quando uma CLI falhar

### Testes

- [x] Testar disponibilidade de cada CLI suportada
- [x] Testar prompt curto
- [x] Testar prompt longo
- [x] Testar streaming
- [x] Testar timeout
- [x] Testar parse de erro

---

## Fase 1 - Memoria Append-Only com Enriquecimento por LLM

### Estado atual

- logging existe, mas sem interpretacao semantica.

### Implementacao

- [x] Criar pipeline `EventEnrichmentService`
- [x] Ao receber novo evento, enviar lote para `CliInferenceService`
- [x] Extrair classificacao semantica do evento
- [x] Extrair tags
- [x] Extrair nivel de relevancia
- [x] Extrair entidades citadas
- [x] Extrair acao sugerida
- [x] Persistir enrichment ao lado do evento original

### Esquema sugerido

- [x] Definir schema JSON para enrichment de evento
- [x] Validar parse de retorno por schema
- [x] Salvar eventos com `raw` + `enriched`

### Compatibilidade multi-CLI

- [x] Garantir prompt de enrichment agnostico a provider
- [x] Criar normalizacao para saidas textuais diferentes

---

## Fase 2 - Observacao Continua com Interpretacao em Background

### Estado atual

- observer existe, mas nao interpreta semantica com modelo.

### Implementacao

- [x] Criar fila de eventos observados priorizada
- [x] Distinguir eventos criticos vs triviais
- [x] Enviar apenas eventos de alto sinal para LLM
- [x] Detectar anomalias recorrentes
- [x] Gerar explicacoes resumidas de mudancas importantes
- [x] Produzir alertas semanticos para UI e ledger

### Integracao

- [x] Integrar com `PersistentEventBus`
- [x] Integrar com `AutoSyncService`
- [x] Expor resultados via API de observers/ledger

---

## Fase 3 - Sleep Cycle com Sumarizacao Real por LLM

### Estado atual

- consolidator e summarizer sao heuristicas.

### Implementacao

- [x] Criar `SleepInferenceService`
- [x] Alimentar `gemini-cli` com logs consolidados do dia
- [x] Gerar resumo narrativo diario
- [x] Gerar fatos permanentes candidatos
- [x] Detectar contradicoes entre fatos antigos e novos
- [x] Sugerir memorias para pruning semantico
- [x] Produzir artefato markdown e artefato JSON estruturado

### Persistencia

- [x] Salvar `daily-summary.md`
- [x] Salvar `daily-summary.json`
- [x] Salvar `promoted-facts.json`
- [x] Salvar `contradictions.json`

### Guardrails

- [x] Impedir promocao automatica de fatos sem score minimo
- [x] Exigir aprovacao para overwrite de fatos sensiveis

---

## Fase 4 - Recall Contextual com Reranking Semantico

### Estado atual

- recall por LIKE + ranking local.

### Implementacao incremental

- [x] Manter busca inicial heuristica atual para custo baixo
- [x] Criar `SemanticRerankService` usando CLI
- [x] Enviar top-N itens recuperados para reranking por Gemini
- [x] Retornar contexto reranqueado por relevancia semantica
- [x] Adicionar justificativa curta por item selecionado

### Fase posterior

- [ ] Adicionar pipeline real de embeddings
- [ ] Usar `VectorStore` como camada de busca semantica primaria ou secundaria
- [ ] Manter CLI para reranking final e contexto compacto

---

## Fase 5 - Execucao Proativa

### Estado atual

- existe base de eventos, pipeline e approval, mas sem proatividade plena por LLM.

### Implementacao

- [x] Criar `ProactivePlannerService`
- [x] Rodar inferencia periodica sobre eventos recentes + memoria relevante
- [x] Gerar lista de riscos
- [x] Gerar lista de oportunidades
- [x] Gerar tasks candidatas
- [x] Gerar recomendacoes acionaveis
- [x] Encaminhar acoes para approval flow

### UX

- [x] Exibir propostas proativas no dashboard
- [x] Exibir racional resumido
- [x] Permitir aprovar, rejeitar ou adiar

---

## Fase 6 - Self-Optimization

### Estado atual

- ha sinais de servicos/agentes de otimizacao, mas sem loop operacional claro.

### Implementacao

- [x] Criar `SelfOptimizationService`
- [x] Agregar metricas de benchmark, erro, latencia e uso de tools
- [x] Rodar analise periodica por CLI
- [x] Sugerir melhorias de configuracao
- [x] Sugerir mudancas de politica
- [x] Sugerir troca de provider/modelo por tipo de task
- [x] Registrar historico de otimizacoes aceitas/rejeitadas

---

## Fase 7 - Benchmark com Recomendacao de Roteamento

### Estado atual

- benchmark atual calcula score com metricas agregadas.

### Evolucao desejada

- [x] Manter benchmark quantitativo atual
- [x] Criar `BenchmarkInterpretationService` por CLI
- [x] Gerar explicacao de quando usar cada modelo
- [x] Gerar politica de roteamento recomendada
- [x] Relacionar tipo de tarefa com provider preferencial
- [x] Alimentar auto-selection do orchestrator

---

## Fase 8 - Politicas, Seguranca e Auditabilidade

### Obrigatorio

- [ ] Toda inferencia de CLI deve registrar provider, comando, duracao e exit code
- [ ] Persistir prompts e outputs quando permitido por politica
- [ ] Separar prompts sensiveis de prompts operacionais
- [ ] Redigir segredos antes de enviar a CLIs
- [ ] Integrar com `ApprovalFlow` para acoes sensiveis
- [ ] Adicionar trilha de auditoria por inferencia

---

## Fase 9 - API e UI

### Backend

- [ ] Criar endpoints para consultar jobs de inferencia em background
- [ ] Criar endpoints para summaries semanticos
- [ ] Criar endpoints para insights proativos
- [ ] Criar endpoints para recall reranqueado

### Frontend

- [ ] Tela para jobs de inferencia
- [ ] Tela para memoria consolidada semantica
- [ ] Tela para insights proativos
- [ ] Exibir provenance do provider usado em cada inferencia

---

## Fase 10 - Compatibilidade Multi-CLI

### Gemini como padrao

- [ ] Implementar prompts e schemas com `gemini-cli` primeiro

### Margem para outras CLIs

- [ ] Garantir que prompt templates nao dependam de sintaxe exclusiva do Gemini
- [ ] Suportar provider fallback por task
- [ ] Adicionar matriz de capacidade por CLI
- [ ] Permitir override por configuracao
- [ ] Permitir testes A/B entre CLIs

### Matriz minima desejada

- [ ] `gemini-cli` para sumarizacao, enrichment, reranking, proactive planning
- [ ] `claude` para tasks longas e analise/reflexao profunda
- [ ] `copilot` para tarefas de codigo e automacao em repositorio
- [ ] `codex` como opcional quando instalado

---

## Artefatos a Produzir

- [ ] `docs/ARQUITETURA-LLM-CLI.md`
- [ ] `docs/SCHEMAS-LLM-CLI.md`
- [ ] `docs/PROMPTS-OPERACIONAIS.md`
- [ ] `docs/MATRIZ-COMPATIBILIDADE-CLIS.md`
- [ ] `docs/RUNBOOK-JOBS-BACKGROUND.md`

---

## Criterios de Conclusao

Este TODO so pode ser considerado concluido quando:

- [ ] memoria append-only recebe enrichment semantico por CLI
- [ ] sleep cycle gera resumo real por LLM
- [ ] recall usa reranking semantico
- [ ] sistema gera sugestoes proativas por inferencia real
- [ ] benchmark alimenta recomendacao de roteamento
- [ ] tudo funciona com `gemini-cli`
- [ ] tudo permanece abstraido para outras CLIs
- [ ] approval e auditoria cobrem as inferencias criticas
