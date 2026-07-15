# KAIROS

> Harness para LLMs locais. Tool calling que funciona com modelos pequenos.

## O problema

Ferramentas como Claude Code, GitHub Copilot e opencode são otimizadas para **modelos cloud** (Claude 3.5, GPT-4o) — modelos que seguem instruções e fazem tool calling confiável.

Quando você usa **modelos locais** (Llama, Qwen, Mistral, Nemotron via Ollama/LM Studio/vLLM), essas ferramentas não funcionam bem. Os modelos locais:

- Produzem JSON malformado nos tool calls
- Não respeitam schemas de parâmetros
- Se perdem em tarefas multi-step
- Têm context windows menores
- Seguem instruções de forma inconsistente

**Nenhuma ferramenta existente resolve isso.** O mercado de "local LLM agent harness" tem 10 projetos no GitHub, nenhum com adoção real.

## O que o Kairos faz

Kairos é um agente CLI que **compensa as fraquezas de modelos locais** com um harness de tool calling elaborado:

- **Schema enforcement** — valida todo input de tool com Zod antes de executar
- **Tool call repair** — corrige JSON malformado automaticamente (aspas, chaves, escaping)
- **Multi-step orchestration** — o SDK orquestra turns automaticamente, executando tools e alimentando resultados de volta
- **Context management** — (planejado) compaction e priorização para janelas pequenas
- **Multi-pass verification** — (planejado) modelos locais são grátis, então pode-se rodar verificações extras sem custo

## Status

Funcionando e testado com:
- **nvidia/nemotron-3-nano-4b** via LM Studio (4B params)
- Qualquer endpoint OpenAI-compatible (Ollama, vLLM, SGLang, LM Studio)

Tools disponíveis: `read`, `write`, `bash`, `list`

## Quick start

```bash
# Dependências
bun install

# LM Studio (já com modelo carregado)
KAIROS_BASE_URL=http://localhost:1234/v1 \
KAIROS_MODEL=nvidia/nemotron-3-nano-4b \
bun src/cli.ts "list files in this directory"

# Ollama
KAIROS_BASE_URL=http://localhost:11434/v1 \
KAIROS_MODEL=qwen2.5-coder:14b \
bun src/cli.ts

# vLLM / SGLang
KAIROS_BASE_URL=http://localhost:8000/v1 \
KAIROS_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct \
bun src/cli.ts "explain the architecture of this project"
```

## Configuração

| Variável | Default | Descrição |
|---|---|---|
| `KAIROS_BASE_URL` | `http://localhost:11434/v1` | URL do servidor (Ollama, LM Studio, vLLM, SGLang) |
| `KAIROS_MODEL` | `qwen2.5-coder:14b` | ID do modelo no servidor |
| `KAIROS_API_KEY` | (none) | API key se o servidor exigir |

Flags: `--model <name>`, `--base-url <url>`

## Estrutura

```
kairos/
├── src/
│   ├── cli.ts              # Entry point + REPL interativo
│   ├── harness.ts          # Core: orquestra planner → router → LLM → tools
│   ├── planner.ts          # Divide tarefas em steps (LLM call separada)
│   ├── router.ts           # Tool Router: filtra tools por intenção (heurística)
│   ├── context.ts          # Context Cache: seleciona arquivos relevantes
│   ├── providers/
│   │   └── local.ts        # Conector OpenAI-compatible
│   └── tools/
│       ├── registry.ts     # Tool registry + Zod validation + JSON repair
│       └── builtin.ts      # read, write, bash, list
├── docs/
│   └── adr/                # Decision records
├── package.json            # ai (Vercel AI SDK) + zod
└── tsconfig.json
```

## Roadmap

### Pronto
- [x] CLI com query única e REPL
- [x] Conector OpenAI-compatible (Ollama, LM Studio, vLLM, SGLang)
- [x] Tools: read, write, bash, list
- [x] Tool call repair (JSON malformado)
- [x] Multi-step automático via Vercel AI SDK
- [x] **Planner externo** — divide tarefas em steps (LLM não planeja sozinho)
- [x] **Tool Router** — filtra tools por intenção (reduz erros em modelos 4B)
- [x] **Context Cache** — envia só arquivos relevantes (economiza tokens)

### Próximo
- [ ] Validator — verifica resultado de cada step antes de continuar
- [ ] Model-adaptive prompting (ajustar strategy por modelo)
- [ ] Context window management (compaction para janelas pequenas)
- [ ] Mais tools: grep, glob, edit, web_search

### Futuro
- [ ] MCP client (conectar servidores MCP)
- [ ] Checkpointing (salvar/resumir sessões)
- [ ] Frontend app (Next.js)
- [ ] Plugin system
