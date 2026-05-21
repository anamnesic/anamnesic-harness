# Tests and lint

There is no repo-wide test or lint command at the root. Use package-level scripts instead.

## Root

```sh
npm run build
```

## packages/nextjs

```sh
cd packages/nextjs
npm run dev
npm run build
npm run start
npm run lint
```

## packages/vscode

```sh
cd packages/vscode
npm run build
npm run compile
npm run package
```

Notes:
- The `package` script uses `pnpm exec vsce package`, so pnpm must be available in that directory.
