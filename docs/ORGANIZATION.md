# Kairos - Organização do Projeto

## Visão geral

Kairos é um monorepo de um agente de IA persistente e proativo, com suporte a interfaces web, CLI, API e integrações extensíveis.

O repositório combina: 

- app web em **Next.js**
- backend de agentes, memória e observação em **src/**
- extensões e integradores em **extensions/**
- documentação em **docs/**
- suporte nativo e desktop em **src-tauri/**

## Estrutura principal

### `package.json`

- Define o pacote principal `kairos`
- Expõe binários: `kairos-mcp`, `kairos-api`, `think`
- Contém scripts de build e execução para:
  - app web
  - backend
  - CLI
  - VS Code

### `app/`

- Frontend em Next.js
- Contém `layout.tsx`, `page.tsx`, `providers.tsx`
- Usado para interfaces visuais do produto

### `src/`

Núcleo de aplicação. Aqui estão as principais camadas e responsabilidades.

- `src/core/`
  - Motor de agentes e lógica central
  - Contém:
    - `agents`
    - `chat`
    - `skills`
    - `tools`
    - `tasks`
    - `providers`
    - `policies`
    - `pipeline`
    - `services`

- `src/interfaces/`
  - Pontos de entrada do produto
  - `api` → servidor MCP/API
  - `cli` → interface de linha de comando
  - `dashboard` → painel ou UI de controle
  - `llm-server` → servidor de LLM

- `src/memory/`
  - Gerenciamento de memória persistente
  - Conversas, índices e dados de recuperação

- `src/observation/`
  - Coleta de eventos do ambiente
  - Observadores para código, terminal e outros sinais

- `src/recall/`
  - Recuperação de contexto e construção de prompts

- `src/sleep/`
  - Consolidação, resumos e poda de memória

- `src/policies/`
  - Guardrails e fluxos de aprovação

- `src/components/` e `src/screens/`
  - Componentes UI e telas da aplicação

## Estrutura de extensões

### `extensions/`

- Conectores de provedores, canais e integrações
- Plugins para serviços externos e funcionalidades opcionais
- Ideal para novos provedores ou canais que não fazem parte do núcleo

## Como organizar novas funcionalidades

### 1. Identificar o tipo de funcionalidade

- Nova capacidade de agente → `src/core/...`
- Nova integração / provedor → `src/core/providers` ou `extensions/...`
- Nova ferramenta / ação → `src/core/tools`
- Nova skill / fluxo → `src/core/skills`
- Nova política de segurança → `src/core/policies`
- Nova observação / input → `src/observation/observers`
- Nova memória / indexação → `src/memory/` ou `src/recall/`
- Nova interface CLI/API/dashboard → `src/interfaces/...`
- Nova UI → `src/components/` ou `src/screens/`

### 2. Seguir a camada correta

- `observation` captura dados
- `memory` armazena dados
- `recall` recupera contexto
- `core` decide e age
- `interfaces` expõe a funcionalidade ao usuário

### 3. Modularidade e separação

- Crie novos módulos ou pastas quando a funcionalidade crescer
- Evite misturar backend de agente com frontend
- Separe lógica, integração, UI e configuração

### 4. Testes

- Adicione testes nos diretórios existentes ou próximos à funcionalidade
- Exemplos:
  - `src/core/.../__tests__`
  - `src/policies/__tests__`
  - `src/recall/__tests__`

### 5. Documentação

- Atualize `docs/` quando o recurso for relevante
- Registre mudanças importantes no README ou roadmap interno

## Exemplo prático

### Novo recurso de “ação automática ao detectar um evento”

- `src/observation/observers/` para capturar o evento
- `src/core/actions/` para implementar a ação
- `src/core/policies/` se precisar de guardrail
- `src/memory/` ou `src/recall/` se houver histórico envolvido
- `src/interfaces/cli/` ou `src/interfaces/api/` para expor a nova funcionalidade

### Novo serviço externo ou canal

- `extensions/` se for uma integração plugin-like
- `src/core/providers/` se for um suporte interno ao motor principal

## Recomendações finais

1. Identifique primeiro se é componente de núcleo ou extensão.
2. Escolha a camada do fluxo que ela entra.
3. Coloque o código em `src/` ou `extensions/` conforme o impacto.
4. Mantenha o Kairos bem organizado e escalável.
