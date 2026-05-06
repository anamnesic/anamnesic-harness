# TODO - github-desktop

Este projeto é um repositório externo e não faz parte central de Kairos.

Objetivo: extrair apenas as capacidades necessárias para Kairos e depois remover este subprojeto.

O que pode ser extraído para Kairos:

- [ ] Camada de integração Git/Version Control orientada a agentes: status, diffs, commits, branches, merges.
- [ ] Operações de repositório local: clone, checkout, status, diff, add, reset, commit, log, branch, merge.
- [ ] Observação de mudanças de workspace/Git para disparar eventos de análise ou recall.
- [ ] Interfaces de metadados de arquivos e commits para histórico de contexto e auditoria.
- [ ] Estrutura de detecção de repositórios e roots de workspace em projetos locais.
- [ ] Abstração de credenciais/repositório remotos sem trazer Electron ou UI pesada.
- [ ] Políticas de sincronização de estado entre Git local e agente, sem dependência do desktop app.
- [ ] Modelos de UX apenas como referência conceitual para visualização de mudanças e revisão de código; não importar o código UI.

Remover depois de extrair:

- [ ] Todo o código Electron/Webpack/desktop específico.
- [ ] Bibliotecas e dependências de UI do GitHub Desktop.
- [ ] Scripts e configurações de build que não são necessárias para o core Kairos.
