# src/

O diretório `src/` contém o código-fonte do backend TypeScript do Kairos: servidor de API REST, interfaces de entrada (CLI, extensão, dashboard), gerenciamento de memória persistente e módulos de infraestrutura.

## Subdiretórios

| Diretório | Descrição |
|---|---|
| `core/` | Módulos centrais do backend: agente, sessões, configuração, LLM providers |
| `interfaces/` | Interfaces de entrada: CLI, servidor API REST, extensão VS Code, dashboard |
| `memory/` | Gerenciamento de memória persistente: store, retrieval, embeddings |

## Estrutura Geral

```
src/
├── core/          # Lógica central do agente e runtime
├── interfaces/    # CLI, API REST, dashboard, extensões
└── memory/        # Persistência e recuperação de memória
```

> O código principal do runtime completo vive em `packages/kairoscode/`. Este `src/` é complementar, com a camada de API e interfaces.
