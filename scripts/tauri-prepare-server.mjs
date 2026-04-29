#!/usr/bin/env node
// Copies the Next.js standalone build into src-tauri/server-bundle/ so it can
// be embedded as a Tauri bundle resource and started at runtime.

import { existsSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const standalone = join(root, '.next', 'standalone');
const staticDir = join(root, '.next', 'static');
const publicDir = join(root, 'public');
const target = join(root, 'src-tauri', 'server-bundle');

if (!existsSync(standalone)) {
    console.error(
        '[tauri-prepare-server] .next/standalone not found. Did "pnpm build" run with output: "standalone"?',
    );
    process.exit(1);
}

console.log('[tauri-prepare-server] preparing', target);
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

cpSync(standalone, target, { recursive: true });
mkdirSync(join(target, '.next'), { recursive: true });
cpSync(staticDir, join(target, '.next', 'static'), { recursive: true });
if (existsSync(publicDir)) {
    cpSync(publicDir, join(target, 'public'), { recursive: true });
}

console.log('[tauri-prepare-server] done');
