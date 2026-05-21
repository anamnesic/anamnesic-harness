# packages/

O diretório `packages/` contém todos os pacotes internos do monorepo Kairos. Cada subdiretório é um pacote independente com sua própria responsabilidade, podendo ser publicado separadamente ou consumido pelos demais pacotes do monorepo via referências locais.

## Subdiretórios

| Diretório | Descrição |
|---|---|
| `app/` | Web app Next.js — UI principal do Kairos, utilizada também em mobile via Capacitor |
| `brain/` | Documentação interna do módulo Brain |
| `cli/` | Interface de linha de comando (CLI) do Kairos |
| `contract/` | Contratos de tipos compartilhados entre os pacotes do monorepo |
| `core/` | Pacote core com lógica de agentes reutilizável |
| `devtools/` | Ferramentas de desenvolvimento: scripts de CI, release, containers e QA |
| `editor/` | Extensão para VS Code |
| `infra/` | Código de infraestrutura e deploy (SST, Fly.io) |
| `integrations/` | Integrações com serviços externos |
| `kairoscode/` | Pacote principal do runtime Kairos — CLI, servidor, TUI e storage |
| `openapi/` | Especificação OpenAPI gerada |
| `plugins/` | Sistema de plugins do Kairos |
| `registry/` | Registro de extensões e plugins |
| `sdk/` | SDK público do Kairos |
| `state/` | Gerenciamento de estado global |
| `ui/` | Componentes de UI compartilhados entre os pacotes |
| `vault/` | Vault criptografado para armazenamento de dados sensíveis |
| `web/` | Pacote web auxiliar |
