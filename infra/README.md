# `infra/`

Contém os arquivos de infraestrutura e deploy do Kairos. Aqui ficam as configurações das plataformas de hospedagem (Fly.io, Render) e das stacks AWS via SST (Ion/CDK), além do gerenciamento de secrets de ambiente.

## Arquivos principais

| Arquivo | Descrição |
|---|---|
| `sst.config.ts` | Ponto de entrada da configuração SST; define o app e carrega as stacks. |
| `app.ts` | Configuração complementar do app SST (nome, região, provedores). |
| `console.ts` | Stack de ambiente para o console Kairos. |
| `stage.ts` | Stack de ambiente de staging/preview. |
| `enterprise.ts` | Stack de ambiente enterprise. |
| `secret.ts` | Definição e gerenciamento de secrets das stacks SST. |
| `fly.toml` | Configuração de deploy público no Fly.io. |
| `fly.private.toml` | Configuração de deploy privado/interno no Fly.io. |
| `render.yaml` | Configuração de deploy no Render. |
