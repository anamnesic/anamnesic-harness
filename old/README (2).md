<p align="center">
  <a href="https://kairos.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="kairos logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://kairos.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/kairos-ai"><img alt="npm" src="https://img.shields.io/npm/v/kairos-ai?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/kairos/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/kairos/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.bs.md">Bosanski</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a> |
  <a href="README.th.md">ไทย</a> |
  <a href="README.tr.md">Türkçe</a> |
  <a href="README.uk.md">Українська</a> |
  <a href="README.bn.md">বাংলা</a> |
  <a href="README.gr.md">Ελληνικά</a> |
  <a href="README.vi.md">Tiếng Việt</a>
</p>

[![kairos Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://kairos.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://kairos.ai/install | bash

# Package managers
npm i -g kairos-ai@latest        # or bun/pnpm/yarn
scoop install kairos             # Windows
choco install kairos             # Windows
brew install anomalyco/tap/kairos # macOS and Linux (recommended, always up to date)
brew install kairos              # macOS and Linux (official brew formula, updated less)
sudo pacman -S kairos            # Arch Linux (Stable)
paru -S kairos-bin               # Arch Linux (Latest from AUR)
mise use -g kairos               # Any OS
nix run nixpkgs#kairos           # or github:anomalyco/kairos for latest dev branch
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

kairos is also available as a desktop application. Download directly from the [releases page](https://github.com/anomalyco/kairos/releases) or [kairos.ai/download](https://kairos.ai/download).

| Platform              | Download                              |
| --------------------- | ------------------------------------- |
| macOS (Apple Silicon) | `kairos-desktop-darwin-aarch64.dmg` |
| macOS (Intel)         | `kairos-desktop-darwin-x64.dmg`     |
| Windows               | `kairos-desktop-windows-x64.exe`    |
| Linux                 | `.deb`, `.rpm`, or AppImage           |

```bash
# macOS (Homebrew)
brew install --cask kairos-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/kairos-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$kairos_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.kairos/bin` - Default fallback

```bash
# Examples
kairos_INSTALL_DIR=/usr/local/bin curl -fsSL https://kairos.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://kairos.ai/install | bash
```

### Agents

kairos includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://kairos.ai/docs/agents).

### Documentation

For more info on how to configure kairos, [**head over to our docs**](https://kairos.ai/docs).

### Contributing

If you're interested in contributing to kairos, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on kairos

If you are working on a project that's related to kairos and is using "kairos" as part of its name, for example "kairos-dashboard" or "kairos-mobile", please add a note to your README to clarify that it is not built by the kairos team and is not affiliated with us in any way.

### FAQ

#### How is this different from kairos Code?

It's very similar to kairos Code in terms of capability. Here are the key differences:

- 100% open source
- Not coupled to any provider. Although we recommend the models we provide through [kairos Zen](https://kairos.ai/zen), kairos can be used with kairos, OpenAI, Google, or even local models. As models evolve, the gaps between them will close and pricing will drop, so being provider-agnostic is important.
- Out-of-the-box LSP support
- A focus on TUI. kairos is built by neovim users and the creators of [terminal.shop](https://terminal.shop); we are going to push the limits of what's possible in the terminal.
- A client/server architecture. This, for example, can allow kairos to run on your computer while you drive it remotely from a mobile app, meaning that the TUI frontend is just one of the possible clients.

---

**Join our community** [Discord](https://discord.gg/kairos) | [X.com](https://x.com/kairos)
