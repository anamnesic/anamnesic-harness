# Frontends do Kairos

Este documento lista todos os frontends e interfaces de usuário disponíveis no projeto Kairos.

## 1. CLI / Terminal (packages/cli)

**Localização:** `packages/cli/`

**Descrição:** Interface de linha de comando principal do Kairos. Fornece comandos, interface Ink, TUI (Terminal User Interface), telas e pontos de entrada para interação via terminal.

**Tecnologias:** TypeScript, Ink (React para terminal)

**Uso:** Linha de comando para gerenciar sessões, provedores e executar comandos Kairos.

---

## 2. TUI - Terminal User Interface (packages/kairoscode)

**Localização:** `packages/kairoscode/src/`

**Descrição:** Interface de terminal interativa integrada ao runtime principal do Kairos. Parte do pacote `@kairos/kairoscode`.

**Tecnologias:** SolidJS, opentui

**Uso:** Interface visual no terminal para interação com agentes e gestão do runtime.

---

## 3. Web UI (packages/ui)

**Localização:** `packages/ui/`

**Descrição:** Interface web do Kairos. Pacote interno de UI do monorepo com componentes visuais e páginas web.

**Tecnologias:** Vite, TypeScript

**Arquivos principais:** `index.html`, `vite.config.ts`, `src/`

**Uso:** Interface web para interação com o Kairos via navegador.

---

## 4. Documentação Web (packages/web)

**Localização:** `packages/web/`

**Descrição:** Site de documentação do Kairos construído com Astro e Starlight.

**Tecnologias:** Astro, Starlight

**Uso:** Documentação oficial navegável via web em `localhost:4321` (dev) ou hospedada.

**Comandos:**
- `npm run dev` - Servidor local
- `npm run build` - Build de produção

---

## 5. VS Code Extension (sdks/vscode)

**Localização:** `sdks/vscode/`

**Descrição:** Extensão oficial do Kairos para Visual Studio Code. Integra o Kairos diretamente no fluxo de desenvolvimento.

**Tecnologias:** TypeScript, VS Code Extension API

**Recursos:**
- Quick Launch: `Cmd+Esc` / `Ctrl+Esc`
- Nova sessão: `Cmd+Shift+Esc` / `Ctrl+Shift+Esc`
- Referências de arquivo: `Cmd+Option+K` / `Alt+Ctrl+K`
- Consciência de contexto automática

**Build:** `esbuild` via `packages/editor/esbuild.vscode.js`

---

## 6. iOS App (apps/ios)

**Localização:** `apps/ios/`

**Descrição:** Aplicativo nativo para iPhone. Status: super-alpha, uso interno.

**Tecnologias:** Swift, SwiftUI, Xcode 16+

**Recursos:**
- Conexão com Kairos Gateway como `role: node`
- Chat e Talk
- Comandos de dispositivo: câmera, canvas, tela, localização, contatos, calendário, lembretes, fotos
- Notificações push via APNs
- Compartilhamento via Share Extension

**Distribuição:** TestFlight (beta interna), build local via Xcode

**Comandos:**
- `pnpm ios:open` - Abrir projeto no Xcode
- `pnpm ios:beta` - Build e upload para TestFlight

---

## 7. Android App (apps/android)

**Localização:** `apps/android/`

**Descrição:** Aplicativo nativo para Android. Status: extremely alpha, sendo reconstruído.

**Tecnologias:** Kotlin, Jetpack Compose, Android Studio

**Recursos:**
- Onboarding de 4 etapas
- Conexão via Setup Code ou Manual
- Chat UI com streaming
- Voice e Screen tabs
- Notificações push
- Beacons de presença autenticados
- Comandos de dispositivo (câmera, localização, SMS, etc.)

**Flavors:**
- `play` - Build para Google Play (sem permissões SMS/Call Log)
- `thirdParty` - Build completo para sideload/APK

**Comandos:**
- `pnpm android:install` - Instalar debug build
- `pnpm android:run` - Executar app
- `pnpm android:bundle:release` - Build de release

---

## 8. Editor Integrations (packages/editor)

**Localização:** `packages/editor/`

**Descrição:** Pacote de integrações de editor (`@kairos/editor`). Fornece camadas de comunicação, atalhos de teclado, suporte Vim e bindings nativos.

**Componentes:**
- `src/bridge/` - Comunicação entre VS Code e runtime Kairos
- `src/keybindings/` - Sistema de atalhos de teclado
- `src/vim/` - Suporte ao modo Vim
- `src/native/` - Bindings nativos
- `src/extensions/` - Integrações com editores externos (ex: Zed)

---

## 9. State Management UI (packages/state)

**Localização:** `packages/state/`

**Descrição:** Gerenciamento de estado e componentes internos da UI do Kairos.

**Conteúdo:** State, context, hooks, componentes, bootstrap, buddy

**Uso:** Biblioteca compartilhada de estado para os frontends do Kairos.

---

## Resumo por Tipo

### Interfaces de Terminal
- **CLI** (`packages/cli`) - Comandos de linha de comando
- **TUI** (`packages/kairoscode`) - Interface visual no terminal

### Interfaces Web
- **Web UI** (`packages/ui`) - Interface web principal
- **Documentação** (`packages/web`) - Site de docs com Astro/Starlight

### Integrações de Editor
- **VS Code Extension** (`sdks/vscode`) - Extensão oficial para VS Code
- **Editor Package** (`packages/editor`) - Integrações compartilhadas

### Aplicativos Nativos
- **iOS App** (`apps/ios`) - iPhone app (Swift/SwiftUI)
- **Android App** (`apps/android`) - Android app (Kotlin/Compose)

### Bibliotecas de UI
- **State** (`packages/state`) - Gerenciamento de estado compartilhado

---

## Tecnologias por Frontend

| Frontend | Linguagem | Framework/Lib Principal | Build Tool |
|---|---|---|---|
| CLI | TypeScript | Ink (React) | Bun |
| TUI | TypeScript | SolidJS, opentui | Bun |
| Web UI | TypeScript | Vite | Vite |
| Docs Web | TypeScript | Astro, Starlight | Astro |
| VS Code | TypeScript | VS Code API | esbuild |
| iOS | Swift | SwiftUI | Xcode |
| Android | Kotlin | Jetpack Compose | Gradle |
| Editor | TypeScript | React | esbuild |
| State | TypeScript | React | Bun |
