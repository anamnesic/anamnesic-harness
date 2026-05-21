# Architecture

High-level layout and boundary rules.

## Layout
- source/src - extracted upstream CLI source and main runtime.
- providers/* - provider plugins, each self-contained with its own package.json.
- packages/vscode - VS Code extension that shells out to the Kairos CLI.
- packages/nextjs - optional Next.js UI.
- dist/ - build output (generated).
- vendor/ and source/vendor/ - native binaries and source stubs.

## Dependency boundaries
- Avoid editing dist/ directly; always rebuild via build.ts.
- Behavior changes should land in source/src (not dist/).
- Provider packages should not depend on each other.
- Keep .kairos/ for agent configs and prompts, not runtime code.

## Build entry point
- build.ts compiles source/src/entrypoints/cli.tsx into dist/cli.js.
