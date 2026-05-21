# `packages/kairoscode`

Pacote principal do runtime Kairos (`@kairos/kairoscode`). Concentra a maior parte da lógica de negócio da plataforma, incluindo a CLI, o servidor HTTP, a interface TUI (baseada em SolidJS/opentui), o pipeline de execução de agentes, a gestão de provedores de LLM e a camada de armazenamento persistente via SQLite/Drizzle. Utiliza **Bun** como runtime de execução.

## Estrutura de diretórios

| Diretório / Arquivo | Descrição |
|---|---|
| `src/` | Código-fonte TypeScript — entrypoints da CLI, servidor, TUI, pipeline de agentes, gestão de provedores e storage |
| `test/` | Testes automatizados do pacote |
| `script/` | Scripts de build e utilitários de desenvolvimento |
| `core/` | Módulos de core do agente (sessões, contexto, orquestração) |

## Responsabilidades principais

- **CLI** — Interface de linha de comando para iniciar sessões, gerenciar provedores e executar comandos Kairos
- **Servidor** — Servidor HTTP que expõe a API interna do runtime
- **TUI** — Interface de terminal interativa construída com SolidJS e opentui
- **Storage** — Persistência de dados usando SQLite via Drizzle ORM
- **Pipeline de agentes** — Orquestração do ciclo de vida das mensagens, ferramentas e respostas dos modelos
- **Gestão de provedores** — Carregamento, configuração e roteamento de plugins de provedor de LLM
