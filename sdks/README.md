# sdks/

O diretório `sdks/` contém SDKs do Kairos para plataformas de terceiros — integrações com editores, IDEs e superfícies externas. Cada subdiretório é um SDK independente com seu próprio build e publicação.

## Subdiretórios

| Diretório | Descrição |
|---|---|
| `vscode/` | Extensão VS Code do Kairos (publicada no VS Code Marketplace e Open VSX) |

## `sdks/vscode/`

A extensão VS Code integra o Kairos diretamente ao editor. Já possui um `README.md` próprio detalhado em `sdks/vscode/README.md`. Conteúdo principal:

| Item | Descrição |
|---|---|
| `src/` | Código-fonte TypeScript da extensão |
| `images/` | Ícones e assets da extensão |
| `script/` | Scripts de build e publicação |
| `esbuild.js` | Bundler da extensão |
| `package.json` | Manifesto VS Code (`contributes`, comandos, ativação) |
