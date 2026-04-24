# Development Guide

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18+ | Required for the frontend build |
| [pnpm](https://pnpm.io/) | 8+ | Package manager used in this project |
| [Rust](https://rustup.rs/) | stable | Tauri backend |
| [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) | — | Platform-specific system libraries |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | — | Optional — enables container isolation for `bash` tool |

> **Docker note**: The app runs without Docker, but shell commands will execute directly on the host instead of inside a container.

---

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/kuse-ai/kuse-cowork.git
cd kuse-cowork

# 2. Install JS dependencies
pnpm install

# 3. Start the Tauri development build (hot-reloads frontend + recompiles Rust on change)
pnpm tauri dev
```

The first `tauri dev` run compiles all Rust crates and can take several minutes. Subsequent runs are much faster thanks to incremental compilation.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| Frontend dev server only | `pnpm dev` | Vite dev server without Tauri shell |
| Tauri dev | `pnpm tauri dev` | Full desktop app with hot-reload |
| Frontend build | `pnpm build` | Compile frontend to `dist/` |
| Tauri production build | `pnpm tauri build` | Compile + bundle native installer |
| Preview frontend build | `pnpm preview` | Serve the `dist/` output locally |

---

## Project Structure

```
kuse-cowork/
├── index.html                   # Vite HTML entry
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # JS dependencies and scripts
├── pnpm-lock.yaml               # Lockfile
│
├── src/                         # Frontend — SolidJS + TypeScript
│   ├── index.tsx                # App mount point
│   ├── App.tsx                  # Root component
│   ├── components/              # UI components (each has .tsx + .css)
│   ├── lib/
│   │   ├── ai-client.ts         # Direct AI API calls (chat mode)
│   │   ├── claude.ts            # Anthropic-specific helpers
│   │   ├── mcp-api.ts           # MCP frontend helpers
│   │   └── tauri-api.ts         # All Tauri invoke wrappers + types
│   ├── stores/
│   │   ├── settings.ts          # Settings store + provider presets
│   │   └── chat.ts              # Chat/conversation store
│   └── styles/
│       └── global.css           # Global styles
│
├── src-tauri/                   # Backend — Rust + Tauri
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri app configuration
│   ├── build.rs                 # Tauri build script
│   ├── capabilities/
│   │   └── default.json         # OS permission capabilities
│   ├── bundled-skills/          # Skill markdown files shipped with the app
│   │   ├── pdf.skill.md
│   │   ├── docx.skill.md
│   │   ├── pptx.skill.md
│   │   └── xlsx.skill.md
│   └── src/                     # Rust source (see architecture.md)
│
├── docs/                        # This documentation
└── public/                      # Static assets (logo, icons)
```

---

## Key Dependencies

### Frontend

| Package | Purpose |
|---|---|
| `solid-js` | Reactive UI framework |
| `@solidjs/router` | Client-side routing |
| `@tauri-apps/api` | Tauri IPC bridge |
| `@tauri-apps/plugin-dialog` | Native file/folder picker dialogs |
| `@tauri-apps/plugin-fs` | File system access from frontend |
| `@tauri-apps/plugin-shell` | Open URLs in system browser |
| `@tauri-apps/plugin-store` | Key-value persistence (frontend side) |

### Backend (Rust)

| Crate | Purpose |
|---|---|
| `tauri` | Desktop app framework |
| `reqwest` | Async HTTP client (LLM API calls, MCP HTTP transport) |
| `tokio` | Async runtime |
| `rusqlite` (bundled) | Embedded SQLite database |
| `serde` / `serde_json` | Serialization |
| `bollard` | Docker API client |
| `regex` | Regex search (grep tool) |
| `glob` | File pattern matching |
| `uuid` | Unique ID generation |
| `chrono` | Timestamps |

---

## Development Workflow

### Adding a New Tauri Command

1. Implement the function in `src-tauri/src/commands.rs` with the `#[command]` attribute.
2. Register it in `src-tauri/src/lib.rs` inside `tauri::generate_handler![...]`.
3. Add the corresponding TypeScript wrapper in `src/lib/tauri-api.ts` using `invoke()`.

### Adding a New Tool

1. Create `src-tauri/src/tools/my_tool.rs` implementing:
   - `definition() -> ToolDefinition` — tool schema exposed to the LLM
   - `execute(input: &Value, project_path: &Option<String>) -> Result<String>` — tool logic
2. Register it in `src-tauri/src/tools/mod.rs` inside `get_all_tools()`.
3. Optionally add it to the allowed list in `src-tauri/capabilities/default.json`.

### Adding a New Frontend Component

Components follow the pattern `ComponentName.tsx` + `ComponentName.css` placed in `src/components/`. Import and wire up in `App.tsx` or the relevant parent component.

---

## Building for Production

```bash
pnpm tauri build
```

Outputs are placed in `src-tauri/target/release/bundle/`:

| Platform | Output format |
|---|---|
| macOS | `.dmg` and `.app` |
| Windows | `.msi` and `.exe` (NSIS) |
| Linux | `.deb` and `.AppImage` |

### Environment Notes

- The production build bundles the frontend into the binary — no separate web server is needed.
- Bundled skills (`bundled-skills/`) are embedded at compile time via `build.rs`.
- The SQLite database is created at runtime in the OS app data directory:
  - **macOS**: `~/Library/Application Support/com.kuse.cowork/`
  - **Windows**: `%APPDATA%\com.kuse.cowork\`
  - **Linux**: `~/.config/com.kuse.cowork/`

---

## Debugging

- In debug builds (`tauri dev`), the DevTools panel opens automatically for the WebView.
- Rust `println!` output appears in the terminal that launched `pnpm tauri dev`.
- Use `RUST_LOG=debug pnpm tauri dev` to enable verbose Tauri / Rust logging.
