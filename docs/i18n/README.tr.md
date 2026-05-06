<p align="center">
  <a href="https://kairos.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="kairos logo">
    </picture>
  </a>
</p>
<p align="center">Açık kaynaklı yapay zeka kodlama asistanı.</p>
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

### Kurulum

```bash
# YOLO
curl -fsSL https://kairos.ai/install | bash

# Paket yöneticileri
npm i -g kairos-ai@latest        # veya bun/pnpm/yarn
scoop install kairos             # Windows
choco install kairos             # Windows
brew install anomalyco/tap/kairos # macOS ve Linux (önerilir, her zaman güncel)
brew install kairos              # macOS ve Linux (resmi brew formülü, daha az güncellenir)
sudo pacman -S kairos            # Arch Linux (Stable)
paru -S kairos-bin               # Arch Linux (Latest from AUR)
mise use -g kairos               # Tüm işletim sistemleri
nix run nixpkgs#kairos           # veya en güncel geliştirme dalı için github:anomalyco/kairos
```

> [!TIP]
> Kurulumdan önce 0.1.x'ten eski sürümleri kaldırın.

### Masaüstü Uygulaması (BETA)

kairos ayrıca masaüstü uygulaması olarak da mevcuttur. Doğrudan [sürüm sayfasından](https://github.com/anomalyco/kairos/releases) veya [kairos.ai/download](https://kairos.ai/download) adresinden indirebilirsiniz.

| Platform              | İndirme                               |
| --------------------- | ------------------------------------- |
| macOS (Apple Silicon) | `kairos-desktop-darwin-aarch64.dmg` |
| macOS (Intel)         | `kairos-desktop-darwin-x64.dmg`     |
| Windows               | `kairos-desktop-windows-x64.exe`    |
| Linux                 | `.deb`, `.rpm` veya AppImage          |

```bash
# macOS (Homebrew)
brew install --cask kairos-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/kairos-desktop
```

#### Kurulum Dizini (Installation Directory)

Kurulum betiği (install script), kurulum yolu (installation path) için aşağıdaki öncelik sırasını takip eder:

1. `$kairos_INSTALL_DIR` - Özel kurulum dizini
2. `$XDG_BIN_DIR` - XDG Base Directory Specification uyumlu yol
3. `$HOME/bin` - Standart kullanıcı binary dizini (varsa veya oluşturulabiliyorsa)
4. `$HOME/.kairos/bin` - Varsayılan yedek konum

```bash
# Örnekler
kairos_INSTALL_DIR=/usr/local/bin curl -fsSL https://kairos.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://kairos.ai/install | bash
```

### Ajanlar

kairos, `Tab` tuşuyla aralarında geçiş yapabileceğiniz iki yerleşik (built-in) ajan içerir.

- **build** - Varsayılan, geliştirme çalışmaları için tam erişimli ajan
- **plan** - Analiz ve kod keşfi için salt okunur ajan
  - Varsayılan olarak dosya düzenlemelerini reddeder
  - Bash komutlarını çalıştırmadan önce izin ister
  - Tanımadığınız kod tabanlarını keşfetmek veya değişiklikleri planlamak için ideal

Ayrıca, karmaşık aramalar ve çok adımlı görevler için bir **genel** alt ajan bulunmaktadır.
Bu dahili olarak kullanılır ve mesajlarda `@general` ile çağrılabilir.

[Ajanlar](https://kairos.ai/docs/agents) hakkında daha fazla bilgi edinin.

### Dokümantasyon

kairos'u nasıl yapılandıracağınız hakkında daha fazla bilgi için [**dokümantasyonumuza göz atın**](https://kairos.ai/docs).

### Katkıda Bulunma

kairos'a katkıda bulunmak istiyorsanız, lütfen bir pull request göndermeden önce [katkıda bulunma dokümanlarımızı](./CONTRIBUTING.md) okuyun.

### kairos Üzerine Geliştirme

kairos ile ilgili bir proje üzerinde çalışıyorsanız ve projenizin adının bir parçası olarak "kairos" kullanıyorsanız (örneğin, "kairos-dashboard" veya "kairos-mobile"), lütfen README dosyanıza projenin kairos ekibi tarafından geliştirilmediğini ve bizimle hiçbir şekilde bağlantılı olmadığını belirten bir not ekleyin.

### SSS

#### Bu kairos Code'dan nasıl farklı?

Yetenekler açısından kairos Code'a çok benzer. İşte temel farklar:

- %100 açık kaynak
- Herhangi bir sağlayıcıya bağlı değil. [kairos Zen](https://kairos.ai/zen) üzerinden sunduğumuz modelleri önermekle birlikte; kairos, kairos, OpenAI, Google veya hatta yerel modellerle kullanılabilir. Modeller geliştikçe aralarındaki farklar kapanacak ve fiyatlar düşecek, bu nedenle sağlayıcıdan bağımsız olmak önemlidir.
- Kurulum gerektirmeyen hazır LSP desteği
- TUI odaklı yaklaşım. kairos, neovim kullanıcıları ve [terminal.shop](https://terminal.shop)'un geliştiricileri tarafından geliştirilmektedir; terminalde olabileceklerin sınırlarını zorlayacağız.
- İstemci/sunucu (client/server) mimarisi. Bu, örneğin kairos'un bilgisayarınızda çalışması ve siz onu bir mobil uygulamadan uzaktan yönetmenizi sağlar. TUI arayüzü olası istemcilerden sadece biridir.

---

**Topluluğumuza katılın** [Discord](https://discord.gg/kairos) | [X.com](https://x.com/kairos)
