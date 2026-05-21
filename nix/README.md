# `nix/`

Contém os arquivos Nix responsáveis pelos builds reproduzíveis do Kairos.
Usando Nix Flakes, é possível construir e distribuir o projeto de forma determinística, garantindo que o ambiente de build seja idêntico em qualquer máquina.

## Arquivos e diretórios

| Arquivo / Diretório | Descrição |
|---------------------|-----------|
| `flake.nix` | Flake principal do projeto; define pacotes, overlays e shells de desenvolvimento |
| `kairos.nix` | Definição do pacote `kairos` para o ecossistema Nix |
| `node_modules.nix` | Instalação e gerenciamento das dependências Node.js via Nix |
| `hashes.json` | Hashes criptográficos dos pacotes para verificação de integridade |
| `scripts/` | Scripts auxiliares utilizados durante o processo de build Nix |
