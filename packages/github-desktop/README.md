# Kairos

Kairos is a desktop Git client based on GitHub Desktop, adapted for the Kairos
workflow and focused on a better Linux experience.

It keeps the familiar GitHub Desktop foundation - Electron, TypeScript, React,
visual repository management, history, diffs, branches, commits, fetch/pull/push
- and extends it with capabilities that make local development and assisted Git
flows easier to use on Linux.

## What Kairos is

Kairos is a fork for people who want:

- a Git desktop app with native Linux packaging, including `.deb`
- Git hook execution with visible terminal-style output inside the app
- GitHub Copilot-powered workflows such as commit message generation and conflict
  resolution
- Bring Your Own Key model provider support for Copilot-backed features
- the GitHub Desktop interaction model without being limited to the upstream
  distribution story

## Highlights

- **Git-first desktop workflow** for cloning, opening, reviewing changes,
  committing, branching, merging, rebasing, and syncing repositories
- **Linux-ready distribution** with Debian packaging support in the build
  pipeline
- **Copilot integration** already wired into the app, including preferences and
  feature-flagged AI workflows
- **Hook visibility** with captured terminal output so repository automation is
  easier to understand when something fails
- **Built on GitHub Desktop** so the project stays close to a proven desktop Git
  experience

## Positioning

Kairos is **not** the official GitHub Desktop distribution. It is a derivative
project built on top of the upstream codebase and adapted to serve Kairos-specific
desktop and Linux needs.

## Development

Kairos is built with:

- Electron
- TypeScript
- React

Repository setup and contributor docs are still available in `docs/` and
`.github/`.

## Building

The repository can be built locally, and the Linux packaging flow now produces a
Debian package:

```bash
pnpm install
node vendor/yarn-1.21.1.js --cwd app install --force --ignore-engines
NODE_ENV=production RELEASE_CHANNEL=production pnpm run build:prod
NODE_ENV=production RELEASE_CHANNEL=production pnpm run package
```

The Debian artifact is generated in `dist/`.

## License

**[MIT](LICENSE)**

Kairos inherits the upstream GitHub Desktop codebase license where applicable.
Any GitHub trademarks, names, and logos remain the property of GitHub.
