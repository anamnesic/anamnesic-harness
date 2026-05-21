# Regras do repositorio

Estas regras orientam agentes e humanos. Elas derivam do antigo TODO.md.

## Regras

- Trate o repositorio e a pasta docs/ como fonte de verdade.
- Mantenha AGENTS.md curto e usado como mapa, nao como manual.
- Forneca pontos de entrada pequenos e estaveis, com caminhos para contexto adicional.
- Exponha observabilidade legivel por agentes (logs, metricas, traces).
- Permita instancias isoladas do app (worktrees) para reproduzir bugs e validar mudancas.
- Imponha invariantes arquiteturais, nao microgerencie implementacoes.
- Automatize regras com linters e testes estruturais.
- Otimize o repositorio para legibilidade do agente com artefatos versionados e locais.
- Transforme decisoes e planos em artefatos versionados.
- Decomponha objetivos em blocos menores (design, codigo, revisao, testes).
- Instrua o agente a revisar e iterar suas proprias PRs.
- Exponha contexto de execucao efemero por worktree e limpe ao final.
- Capture o gosto humano uma vez e aplique continuamente.
- Automatize coleta de lixo e refatoracao recorrente.
- Prefira dependencias e abstracoes faceis de modelar.
- Adapte a filosofia de mesclagem a velocidade do agente (PRs curtas).
- Mantenha humanos no nivel de priorizacao e validacao.
- Instrumente o repositorio para requisitos nao funcionais (latencia, tempos de inicializacao).
