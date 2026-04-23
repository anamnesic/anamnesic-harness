#!/usr/bin/env node
// Standalone probe — run while the Antigravity editor is open.
//   node scripts/probe-language-server.mjs
//
// Prints the discovery info and pings candidate gRPC-Web endpoints so we can
// map the real Cascade service names.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

// Load the compiled module so we don't duplicate logic.
const distPath = resolve(here, '..', 'dist', 'antigravityClient.js');
let mod;
try {
    mod = require(distPath);
} catch (err) {
    console.error(
        `[probe] Could not load ${distPath}. Run \`pnpm run build\` first.\n`,
        err.message,
    );
    process.exit(2);
}

const { findRunningLanguageServer, LanguageServerClient, probeServices } = mod;

const info = findRunningLanguageServer();
if (!info) {
    console.error(
        '[probe] No running Antigravity language server found.\n' +
            '        Open the Antigravity editor at least once, then retry.',
    );
    process.exit(1);
}

console.log('[probe] Discovery file  :', info.filePath);
console.log('[probe] PID             :', info.pid);
console.log('[probe] httpsPort       :', info.httpsPort);
console.log('[probe] httpPort        :', info.httpPort);
console.log('[probe] lspPort         :', info.lspPort);
console.log('[probe] lsVersion       :', info.lsVersion);
console.log('[probe] csrfToken (len) :', info.csrfToken.length, 'chars');
console.log();

const client = new LanguageServerClient(info);
const results = await probeServices(client);

for (const r of results) {
    const label = `${r.target.service}/${r.target.method}`;
    if (r.ok) {
        console.log(`  OK    ${label}`);
        console.log(`        sample: ${JSON.stringify(r.sample).slice(0, 400)}`);
    } else if (r.grpcStatus !== undefined) {
        console.log(`  ROUTE ${label}   (grpc ${r.grpcStatus}: ${r.error})`);
    } else {
        console.log(`  MISS  ${label}   (${r.error})`);
    }
}
