# packages/editor

Pacote de integrações de editor do Kairos (`@kairos/editor`). Fornece as camadas de comunicação, atalhos de teclado, suporte a Vim, bindings nativos e extensões de terceiros que sustentam a experiência de edição dentro do VS Code e de outras superfícies do projeto. O build de produção é gerado via `esbuild.vscode.js`, empacotando a extensão como módulo CommonJS compatível com Node 18.

## Estrutura

| Caminho | Descrição |
|---|---|
| `src/bridge/` | Camada de comunicação entre a extensão VS Code e o runtime Kairos; inclui API, mensagens, sessões, transporte e utilidades de autenticação (JWT, trusted device) |
| `src/keybindings/` | Sistema de atalhos de teclado: contexto React, resolução de conflitos, parser, esquema de validação e carregamento de bindings do usuário |
| `src/vim/` | Suporte ao modo Vim: motions, operadores, objetos de texto, transições de modo e tipos compartilhados |
| `src/native/` | Bindings nativos e utilitários de baixo nível (diff de cores, índice de arquivos, layout Yoga) |
| `src/extensions/` | Integrações com editores externos (ex.: Zed) |
| `esbuild.vscode.js` | Script de build que empacota a extensão VS Code em `dist/` |
| `package.json` | Manifesto do pacote; exporta todos os submódulos via `./src/*/index.ts` |
