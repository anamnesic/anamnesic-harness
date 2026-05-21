# @chronokairo/kairos-code

> Based on `@anthropic-ai/claude-code@2.1.88` — extended with free-tier AI model providers from the Kairos extension catalogue.

## Model Providers

### Paid / cloud-managed (original)

| Provider | Env var | Description |
|----------|---------|-------------|
| `firstParty` | *(default)* | Anthropic API (`api.anthropic.com`) |
| `anthropic` | `CHRONOKAIRO_USE_ANTHROPIC=1` | Anthropic via Kairos plugin (`providers/anthropic`) |
| `anthropic-vertex` | `CHRONOKAIRO_USE_ANTHROPIC_VERTEX=1` | Claude on Google Vertex AI via Kairos plugin |
| `bedrock` | `CLAUDE_CODE_USE_BEDROCK=1` | AWS Bedrock |
| `vertex` | `CLAUDE_CODE_USE_VERTEX=1` | Google Cloud Vertex AI |
| `foundry` | `CLAUDE_CODE_USE_FOUNDRY=1` | Azure AI Foundry |

### Free-tier providers (added)

| Provider | Env var | Free tier |
|----------|---------|-----------|
| `groq` | `CHRONOKAIRO_USE_GROQ=1` | Free tier – limited RPM/RPD |
| `ollama` | `CHRONOKAIRO_USE_OLLAMA=1` | Local inference, always free |
| `lmstudio` | `CHRONOKAIRO_USE_LMSTUDIO=1` | Local inference, always free |
| `huggingface` | `CHRONOKAIRO_USE_HUGGINGFACE=1` | Free Inference API (rate-limited) |
| `mistral` | `CHRONOKAIRO_USE_MISTRAL=1` | Free models on La Plateforme |
| `deepseek` | `CHRONOKAIRO_USE_DEEPSEEK=1` | Free API tier |
| `cerebras` | `CHRONOKAIRO_USE_CEREBRAS=1` | Free tier |
| `together` | `CHRONOKAIRO_USE_TOGETHER=1` | Free tier (limited) |
| `deepinfra` | `CHRONOKAIRO_USE_DEEPINFRA=1` | Free tier |
| `google` | `CHRONOKAIRO_USE_GOOGLE=1` | Gemini free API tier |
| `cloudflare` | `CHRONOKAIRO_USE_CLOUDFLARE=1` | Cloudflare AI Gateway free tier |
| `fireworks` | `CHRONOKAIRO_USE_FIREWORKS=1` | Free tier (limited) |
| `github-copilot` | `CHRONOKAIRO_USE_GITHUB_COPILOT=1` | Free via GitHub Copilot subscription |
| `nvidia` | `CHRONOKAIRO_USE_NVIDIA=1` | Free credits — [build.nvidia.com](https://build.nvidia.com/explore/discover) |

Provider plugin source lives in `providers/<name>/`. Each folder is a self-contained Kairos extension with its own `index.ts` and `package.json`.

## Docs

- [README.md](README.md) - documentation index.
- [rules.md](rules.md) - agent rules.
- [testing.md](testing.md) - test/lint commands by package.
- [../AGENTS.md](../AGENTS.md) - agent map.

---

# Source Extraction Notice

This directory contains the source code of `@anthropic-ai/claude-code@2.1.88`, extracted from the published npm package's source map (`cli.js.map`).

## How the source was obtained

```sh
npm pack @anthropic-ai/claude-code@2.1.88
tar xzf anthropic-ai-claude-code-2.1.88.tgz
# Extract sources from cli.js.map into source/
node -e '
const fs = require("fs"), path = require("path");
const map = JSON.parse(fs.readFileSync("cli.js.map", "utf8"));
for (let i = 0; i < map.sources.length; i++) {
  if (map.sourcesContent[i] == null || map.sources[i].includes("node_modules")) continue;
  const rel = map.sources[i].replace(/^\.\.\//g, "");
  const out = path.join("source", rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, map.sourcesContent[i]);
}'
```

## Usage

The bundled `cli.js` is self-contained and runs directly with Node.js >= 18:

```sh
node cli.js --version          # 26.5.10 (Kairos Code)
node cli.js --help             # show all options
node cli.js -p "hello world"   # non-interactive one-shot
node cli.js                    # interactive REPL
```

Or install globally / symlink:

```sh
npm install -g @chronokairo/kairos-code
# or
ln -s "$(pwd)/cli.js" /usr/local/bin/kairos
```

## Rebuilding from source

Rebuilding from the extracted source is **not feasible** because:

- The code uses `import { feature } from 'bun:bundle'` (Bun bundler compile-time API)
- The original `package.json` with ~hundreds of build/dev dependencies is not published
- Build configuration (tsconfig, bundler config) is not included in the source map
- 2,850 bundled `node_modules` dependencies are only present as source map entries

The extracted `source/` tree (1,906 files, 35 MB) is useful for **reading and studying** the internals, not for rebuilding.

## Directory layout

```
.
├── cli.js           # 13 MB self-contained Node.js bundle (the actual executable)
├── cli.js.map       # 57 MB source map (contains all original sources)
├── sdk-tools.d.ts   # TypeScript declarations for the public SDK tools API
├── bun.lock         # Bun lockfile (records exact dependency versions)
├── package.json     # Published package manifest (no build deps)
├── LICENSE.md       # License information
├── README.md        # This file
│
├── source/                        # Extracted source tree (read-only, for study)
│   ├── src/                       # 1,902 TypeScript / TSX application files
│   │   ├── main.tsx               # Top-level application entry point
│   │   ├── commands.ts            # Slash-command registry
│   │   ├── tools.ts               # Tool registry
│   │   ├── tasks.ts               # Task utilities
│   │   ├── context.ts             # Shared context utilities
│   │   ├── query.ts               # Query helpers
│   │   ├── history.ts             # Conversation history
│   │   ├── cost-tracker.ts        # Token / cost accounting
│   │   ├── ink.ts                 # Ink terminal-UI bootstrap
│   │   │
│   │   ├── assistant/             # Session history management
│   │   ├── bootstrap/             # App bootstrap / startup sequence
│   │   ├── bridge/                # Bridge communication layer (IDE ↔ CLI)
│   │   ├── buddy/                 # "Buddy" pairing feature
│   │   ├── cli/                   # CLI-specific glue code
│   │   │
│   │   ├── commands/              # One subdirectory per slash-command (100+)
│   │   │   ├── commit.ts          # /commit
│   │   │   ├── review.ts          # /review
│   │   │   ├── plan/              # /plan (plan mode)
│   │   │   ├── mcp/               # /mcp server management
│   │   │   ├── session/           # /session management
│   │   │   ├── skills/            # /skills
│   │   │   ├── tasks/             # /tasks
│   │   │   ├── voice/             # /voice
│   │   │   └── ...                # many more
│   │   │
│   │   ├── components/            # React / Ink UI components (100+ files)
│   │   │   ├── App.tsx            # Root application component
│   │   │   ├── Message.tsx        # Chat message renderer
│   │   │   ├── PromptInput/       # User prompt input widget
│   │   │   ├── Settings/          # Settings panel
│   │   │   ├── StructuredDiff/    # Side-by-side diff view
│   │   │   ├── agents/            # Agent status / progress components
│   │   │   ├── design-system/     # Shared design tokens & primitives
│   │   │   ├── mcp/               # MCP server UI dialogs
│   │   │   ├── memory/            # Memory usage display
│   │   │   ├── messages/          # Per-message-type renderers
│   │   │   ├── permissions/       # Permission approval dialogs
│   │   │   ├── skills/            # Skill-related UI
│   │   │   ├── tasks/             # Task-list UI
│   │   │   └── ...                # many more
│   │   │
│   │   ├── context/               # React context providers
│   │   │   ├── modalContext.tsx    # Modal / overlay stack
│   │   │   ├── notifications.tsx   # In-app notifications
│   │   │   ├── voice.tsx          # Voice input context
│   │   │   └── ...
│   │   │
│   │   ├── coordinator/           # Multi-agent / swarm coordination
│   │   ├── entrypoints/           # Application entry points
│   │   │   ├── cli.tsx            # Terminal REPL entry point
│   │   │   ├── mcp.ts             # MCP server entry point
│   │   │   └── sdk/               # Programmatic SDK entry point
│   │   │
│   │   ├── hooks/                 # Custom React hooks (100+ hooks)
│   │   │   ├── useSettings.ts     # Settings access
│   │   │   ├── useVoice.ts        # Voice input
│   │   │   ├── useTasksV2.ts      # Background task management
│   │   │   └── ...
│   │   │
│   │   ├── keybindings/           # Keyboard shortcut definitions
│   │   ├── memdir/                # CLAUDE.md memory-directory management
│   │   ├── migrations/            # Settings / data migrations
│   │   ├── moreright/             # Extended right-panel layout
│   │   ├── native-ts/             # TypeScript bindings for native modules
│   │   ├── outputStyles/          # Output style presets (default, compact, …)
│   │   │
│   │   ├── plugins/               # Plugin system
│   │   │   ├── builtinPlugins.ts  # Built-in plugin registrations
│   │   │   └── bundled/           # Bundled plugin implementations
│   │   │
│   │   ├── query/                 # Query engine components
│   │   ├── remote/                # Remote session support
│   │   ├── schemas/               # Zod validation schemas
│   │   │
│   │   ├── screens/               # Full-screen terminal UI views
│   │   │   ├── REPL.tsx           # Main interactive REPL screen
│   │   │   ├── Doctor.tsx         # /doctor diagnostics screen
│   │   │   └── ResumeConversation.tsx
│   │   │
│   │   ├── server/                # Internal HTTP / IPC server
│   │   │
│   │   ├── services/              # Backend services
│   │   │   ├── analytics/         # Usage analytics
│   │   │   ├── api/               # Anthropic API client helpers
│   │   │   ├── lsp/               # Language Server Protocol integration
│   │   │   ├── mcp/               # MCP client management
│   │   │   ├── oauth/             # OAuth flows
│   │   │   ├── compact/           # Conversation compaction
│   │   │   ├── voice.ts           # Voice synthesis / STT
│   │   │   └── ...
│   │   │
│   │   ├── skills/                # Skills system
│   │   │   ├── bundledSkills.ts   # Skills shipped with the binary
│   │   │   ├── loadSkillsDir.ts   # Load user / project skill directories
│   │   │   └── bundled/           # Individual bundled skill definitions
│   │   │
│   │   ├── state/                 # Global application state
│   │   │   ├── AppState.tsx       # Top-level state shape
│   │   │   ├── store.ts           # State store (Zustand-like)
│   │   │   └── selectors.ts       # Derived state selectors
│   │   │
│   │   ├── tools/                 # All callable tools (one folder per tool)
│   │   │   ├── BashTool/          # Run shell commands
│   │   │   ├── FileReadTool/      # Read files
│   │   │   ├── FileEditTool/      # Edit files
│   │   │   ├── FileWriteTool/     # Write new files
│   │   │   ├── GlobTool/          # File glob search
│   │   │   ├── GrepTool/          # Content search (ripgrep)
│   │   │   ├── WebFetchTool/      # Fetch URLs
│   │   │   ├── WebSearchTool/     # Web search
│   │   │   ├── AgentTool/         # Spawn sub-agents
│   │   │   ├── MCPTool/           # Call MCP tools
│   │   │   ├── LSPTool/           # LSP queries
│   │   │   ├── NotebookEditTool/  # Jupyter notebook editing
│   │   │   ├── TodoWriteTool/     # Todo list management
│   │   │   └── ...                # many more
│   │   │
│   │   ├── types/                 # Shared TypeScript type definitions
│   │   ├── upstreamproxy/         # Upstream HTTP proxy support
│   │   ├── vim/                   # Vim-mode key handling
│   │   ├── voice/                 # Voice input / output
│   │   └── utils/                 # Extensive utility library (300+ modules)
│   │       ├── git.ts             # Git helpers
│   │       ├── auth.ts            # Authentication utilities
│   │       ├── config.ts          # Config read / write
│   │       ├── sandbox/           # Sandbox / permissions enforcement
│   │       ├── memory/            # Memory file operations
│   │       ├── bash/              # Bash execution helpers
│   │       └── ...
│   │
│   └── vendor/                    # Native module C/C++/Rust source stubs
│       ├── audio-capture-src/     # Audio capture (microphone input)
│       ├── image-processor-src/   # Image resizing / processing
│       ├── modifiers-napi-src/    # Keyboard modifier key detection
│       └── url-handler-src/       # System URL / deep-link handler
│
└── vendor/                        # Pre-compiled native binaries
    ├── audio-capture/             # Audio capture binaries
    │   ├── arm64-darwin/          #   macOS Apple Silicon
    │   ├── x64-darwin/            #   macOS Intel
    │   ├── arm64-linux/           #   Linux ARM64
    │   ├── x64-linux/             #   Linux x86-64
    │   ├── arm64-win32/           #   Windows ARM64
    │   └── x64-win32/             #   Windows x86-64
    └── ripgrep/                   # ripgrep binaries (used by GrepTool)
        ├── arm64-darwin/
        ├── x64-darwin/
        ├── arm64-linux/
        ├── x64-linux/
        ├── arm64-win32/
        └── x64-win32/
```

---

# Kairos Agent

![](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square) [![npm]](https://www.npmjs.com/package/@anthropic-ai/claude-code)

[npm]: https://img.shields.io/npm/v/@anthropic-ai/claude-code.svg?style=flat-square

Kairos Agent is an agentic coding tool that lives in your terminal, understands your codebase, and helps you code faster by executing routine tasks, explaining complex code, and handling git workflows -- all through natural language commands. Use it in your terminal, IDE, or tag @claude on Github.

**Learn more at [Kairos Agent Homepage](https://claude.com/product/claude-code)** | [Documentation](https://code.claude.com/docs/en/overview)

<img src="https://github.com/anthropics/claude-code/blob/main/demo.gif?raw=1" />

## Get started

1. Install Kairos Agent:

```sh
npm install -g @anthropic-ai/claude-code
```

2. Navigate to your project directory and run `claude`.

## Reporting Bugs

We welcome your feedback. Use the `/bug` command to report issues directly within Kairos Agent, or file a [GitHub issue](https://github.com/anthropics/claude-code/issues).

## Connect on Discord

Join the [Claude Developers Discord](https://anthropic.com/discord) to connect with other developers using Kairos Agent. Get help, share feedback, and discuss your projects with the community.

## Data collection, usage, and retention

When you use Kairos Agent, we collect feedback, which includes usage data (such as code acceptance or rejections), associated conversation data, and user feedback submitted via the `/bug` command.

### How we use your data

See our [data usage policies](https://code.claude.com/docs/en/data-usage).

### Privacy safeguards

We have implemented several safeguards to protect your data, including limited retention periods for sensitive information and restricted access to user session data.

For full details, please review our [Commercial Terms of Service](https://www.anthropic.com/legal/commercial-terms) and [Privacy Policy](https://www.anthropic.com/legal/privacy).
