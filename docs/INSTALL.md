# Kairos Code — Installation Guide

## Prerequisites

- **Node.js** >= 18.0.0 (tested with v24+)
 - **pnpm** (recommended) or **npm** (comes with Node.js)
 - **bun** (required to run the provided `build.ts`). The repo includes `bun` as a devDependency; if the local binary is incompatible you may need to install `bun` globally following https://bun.sh/

## Install from source

**Using pnpm (recommended):**
```sh
# 1. Clone the repository
git clone https://github.com/chronokairo/kairos-code.git
cd kairos-code

# 2. Install dependencies (will install devDependencies including bun)
pnpm install

# 3. Build the project
pnpm run build

# 4. (Optional) Install the CLI globally
pnpm install -g .
```

**Using npm:**
```sh
# 1. Clone the repository
git clone https://github.com/chronokairo/kairos-code.git
cd kairos-code

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. (Optional) Install the CLI globally
npm install -g .
```

Note: the previous release guard required setting `AUTHORIZED=1` during install. That guard has been moved to `prepublishOnly` so local installs and builds no longer need the `AUTHORIZED` env var.

## Verify

```sh
kairos --version
```

Expected output: `26.5.10 (Kairos Agent)`

## Usage

```sh
# Launch interactive session
kairos

# Run a one-shot prompt
kairos "explain this codebase"

# Show help
kairos --help
```

## Model Providers

Kairos supports **free-tier** AI model providers out of the box. Set the corresponding environment variable before launching:

| Provider       | Env var                          |
|----------------|----------------------------------|
| Groq           | `CHRONOKAIRO_USE_GROQ=1`        |
| Ollama (local) | `CHRONOKAIRO_USE_OLLAMA=1`      |
| DeepSeek       | `CHRONOKAIRO_USE_DEEPSEEK=1`    |
| Google Gemini  | `CHRONOKAIRO_USE_GOOGLE=1`      |
| GitHub Copilot | `CHRONOKAIRO_USE_GITHUB_COPILOT=1` |

Example:

```sh
CHRONOKAIRO_USE_GROQ=1 kairos
```

See [overview.md](overview.md) for the full provider list.

## Updating

Pull the latest changes and reinstall:

```sh
git pull
pnpm install
pnpm run build
pnpm install -g .
```
