# TODO - Organização do Projeto

## 1. Estrutura do repositório

- [ ] Revisar e documentar a estrutura de pastas principal (`app`, `apps`, `packages`, `src`, `extensions`, `docs`, `infra`).
- [ ] Consolidar nomes de diretórios e remover duplicatas confusas ou temporárias.
- [ ] Definir regras claras para onde novos recursos, bibliotecas e configurações devem ser colocados.
- [ ] Criar um `README` de alto nível para a raiz que explique a divisão do monorepo.

## 2. Documentação

- [ ] Atualizar `README.md` com visão geral do projeto, dependências principais e comandos de desenvolvimento.
- [ ] Centralizar guias e documentos importantes em `docs/` e criar índices se necessário.
- [ ] Validar que todos os `README` de pacotes e apps estão consistentes e atualizados.
- [ ] Incluir um guia rápido para novos colaboradores com comandos de instalação, build e testes.

## 3. Dependências e configuração de build

- [ ] Revisar `package.json`, `pnpm-workspace.yaml`, `bunfig.toml` e `tsconfig` para dependências desatualizadas ou redundantes.
- [ ] Verificar se os scripts de build e lint funcionam de forma previsível no monorepo.
- [ ] Documentar a maneira recomendada de rodar builds e testes localmente.
- [ ] Garantir que as configurações de bundler e CLI estejam definidas para o fluxo de desenvolvimento ideal.

## 4. Fluxos de trabalho e automação

- [ ] Definir processos claros para branch, PR e revisão de código.
- [ ] Criar ou revisar templates de issue e PR para garantir consistência.
- [ ] Padronizar o uso de ferramentas de formatação e linting (por exemplo, ESLint, Prettier, Bun/Babel).
- [ ] Identificar tarefas que podem ser automatizadas com scripts ou pipelines.

## 5. Qualidade de código e testes

- [ ] Mapear pacotes ou áreas que precisam de cobertura de teste adicional.
- [ ] Garantir que há testes básicos para a infra de build e dependências centrais.
- [ ] Definir padrões de código para novos arquivos e revisões.
- [ ] Revisar se há avisos de tipo ou erros em `bun typecheck` / `pnpm` e documentar a correção.

## 6. Limpeza e priorização

- [ ] Remover arquivos e código não usados, especialmente temporários ou duplicados.
- [ ] Priorizar áreas que afetam diretamente a experiência de desenvolvimento e manutenção.
- [ ] Marcar dependências/ações que podem ser adiadas para uma segunda fase.
- [ ] Criar um checklist mínimo para a próxima etapa de refatoração ou reorganização.

## 7. Comunicação interna

- [ ] Registrar decisões de arquitetura importantes em `docs/` ou comentários no repo.
- [ ] Definir onde e como documentar mudanças significativas na estrutura do projeto.
- [ ] Garantir que a equipe tenha acesso fácil a informações de onboarding e metas do repositório.
