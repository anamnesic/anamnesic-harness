# `packages/app`

Aplicação web principal do Kairos, construída com **Next.js** (App Router). O mesmo código-fonte é compartilhado com as plataformas móveis **iOS** e **Android** por meio do [Capacitor](https://capacitorjs.com/), que empacota o bundle web gerado como um aplicativo nativo.

## Estrutura de diretórios

| Diretório / Arquivo | Descrição |
|---|---|
| `app/` | Rotas da aplicação seguindo o padrão Next.js App Router (layouts, páginas, loading e error boundaries). |
| `src/` | Código-fonte React/TypeScript — componentes, hooks, utilitários e lógica de negócio reutilizável. |
| `scripts/` | Scripts auxiliares de build, incluindo integração e sincronização com o Capacitor. |
| `android/` | Projeto Android nativo gerado automaticamente pelo Capacitor a partir do bundle web. |
| `public/` | Ativos estáticos servidos diretamente (ícones, imagens, manifests). |
| `next.config.*` | Configuração do Next.js (plugins, rewrites, variáveis de ambiente, etc.). |
| `capacitor.config.*` | Configuração do Capacitor (app ID, diretório de saída web, plugins nativos). |
| `package.json` | Dependências e scripts npm/bun do pacote. |
