# scripts/

Contém scripts de automação para release, manutenção e geração de artefatos do monorepo kairos. Os scripts são escritos em TypeScript (executados via Bun) e JavaScript, e são invocados principalmente pelo pipeline de CI/CD e pelos mantenedores do projeto.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `publish.ts` | Publicação de versões estáveis dos pacotes no npm |
| `beta.ts` | Publicação de versões beta/pre-release no npm |
| `changelog.ts` | Geração do changelog formatado a partir do histórico de commits |
| `raw-changelog.ts` | Geração do changelog em formato bruto (sem formatação adicional) |
| `version.ts` | Bump de versão dos pacotes do monorepo |
| `stats.ts` | Coleta e exibição de estatísticas do projeto (ex.: tamanho de bundle, contagem de pacotes) |
| `generate.ts` | Regeneração de artefatos do SDK e tipos TypeScript |
| `sync-zed.ts` | Sincronização de configurações ou extensão com o editor Zed |
| `test-integration.js` | Runner de testes de integração end-to-end |

## Subdiretórios

| Diretório | Descrição |
|---|---|
| `github/` | Scripts específicos para automações e integrações com a API do GitHub |
