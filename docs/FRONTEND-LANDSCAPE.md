# Mapeamento de Frontends

> Gerado em 2026-06-28 — inventário de todos os pacotes de frontend.

## Visão Geral

O projeto tem **duas stacks de UI paralelas** (SolidJS e React) mais uma documentação em Astro e uma TUI em OpenTUI:

```
SolidJS Stack:    packages/ui (componentes) → packages/kairoscode (TUI)
React Stack:      packages/state (app shell) → packages/cli (Ink terminal)
Astro Docs:       packages/web (Starlight docs)
Next.js App:      app/ (landing + dashboard)
```

## Pacotes

### `packages/ui` (`@kairos-ai/ui`) — SolidJS

**Framework:** SolidJS + Vite + Tailwind CSS + Kobalte

**Status:** ✅ Funcional

**Componentes (60+):**
Accordion, AnimatedNumber, AppIcon, Avatar, BasicTool, Button, Card, Checkbox, Collapsible, ContextMenu, Dialog, DiffChanges, DockPrompt, DockSurface, DropdownMenu, Favicon, FileIcon, File (viewer), Font, HoverCard, IconButton, Icon, ImagePreview, InlineInput, Keybind, LineComment, List, Logo, Markdown, MessageNav, MessagePart, Popover, ProgressCircle, Progress, ProviderIcon, RadioGroup, ResizeHandle, ScrollView, Select, SessionRetry, SessionReview, SessionTurn, Spinner, StickyAccordionHeader, Switch, Tabs, Tag, TextField, TextReveal, TextShimmer, TextStrikethrough, Toast, ToolCountLabel, ToolCountSummary, ToolErrorCard, ToolStatusTitle, Tooltip, Typewriter

**Recursos:** Tema (30+ temas, CSS variables), i18n (17 idiomas), pierre diff engine, icon spritesheet

### `packages/state` (`@kairos/state`) — React

**Framework:** React 19 + React Compiler + custom store

**Status:** ✅ Funcional

**Estrutura:**
- `src/store/` — AppState, createStore, selectors
- `src/context/` — 10 context providers (mailbox, modal, notifications, voice, etc.)
- `src/hooks/` — **85 hooks** (useSettings, useIDEIntegration, useVoice, useDiffData, useKeyboard, useVimInput, etc.)
- `src/components/` — **140+ componentes**
  - App.tsx (root wrapper)
  - Messages (33 message type renderers)
  - PromptInput (21 files)
  - Settings (config, status, usage)
  - Markdown, diff, mcp, tasks, skills, teams

### `packages/kairoscode` — Main Runtime + TUI

**Framework:** SolidJS + OpenTUI + Hono + Effect + Bun + Drizzle/SQLite

**Status:** ✅ Funcional

**CLI:** 23 comandos (run, serve, tui, web, agent, providers, models, mcp, etc.)
**TUI:** OpenTUI app com 2 rotas (Home, Session), 29 componentes TUI, 19 context providers
**Server:** HTTP via Hono, WebSocket, middleware

### `packages/cli` — Ink Terminal

**Framework:** Ink (React) — implementação custom in-house

**Status:** ✅ Funcional

**Comandos:** 100+ (add-dir, advisor, agents, branch, commit, config, context, diff, export, feedback, git, help, install, login, mcp, memory, model, review, session, settings, skills, stats, status, teleport, upgrade, vim, voice, etc.)

### `packages/web` — Documentation Site

**Framework:** Astro 5 + Starlight + SolidJS islands + Cloudflare

**Status:** ✅ Funcional

**Páginas:** 52 MDX docs, session share page com WebSocket ao vivo
**i18n:** 17 locales com middleware de redirecionamento

### `packages/editor` — VS Code Extension

**Framework:** TypeScript + esbuild

**Status:** ✅ Funcional

**Módulos:**
- `bridge/` — API, messages, sessions, transport, JWT auth
- `keybindings/` — Schema, parser, resolver, matcher, validator
- `vim/` — Motions, operators, text objects, transitions
- `native/` — Color diffs, file index, Yoga layout

### `app/` — Next.js App

**Framework:** Next.js 16 + React 19 + Tailwind CSS 4 + Lucide

**Status:** ✅ Criado

**Páginas:**
- `/` — Landing page com feature cards e branding
- `/dashboard` — Dashboard ao vivo com dados de health, providers, sessions

**API Routes:**
- `GET /api/health` — Server status
- `GET /api/providers` — 20 providers com model counts
- `GET /api/sessions` — Session records

## Dependências entre Pacotes

```
packages/ui (@kairos-ai/ui)
  └── depende de: @kairos/sdk, @kairos/core

packages/state (@kairos/state)
  └── auto-contido (sem deps workspace)

packages/web (@kairos-ai/web)
  └── depende de: kairos (kairoscode), astro, solid-js

packages/kairoscode (@kairos/kairoscode)
  └── depende de: @kairos-ai/core, @kairos/sdk, solid-js, hono, effect

packages/cli (@kairos/cli)
  └── auto-contido

packages/editor (@kairos/editor)
  └── auto-contido

app/
  └── depende de: next, react, tailwindcss, lucide-react
```

## Como Rodar

```bash
# Next.js app
pnpm next dev --port 3000

# TUI (OpenTUI/SolidJS)
cd packages/kairoscode && bun run dev

# Ink CLI
cd packages/cli && bun run start

# Docs site
cd packages/web && pnpm dev

# UI storybook
cd packages/ui && pnpm storybook
```
