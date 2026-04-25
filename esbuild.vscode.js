const esbuild = require('esbuild');

esbuild
    .build({
        entryPoints: ['src/interfaces/dashboard/extension.ts'],
        bundle: true,
        outfile: 'dist/interfaces/dashboard/extension.js',
        platform: 'node',
        format: 'cjs',
        target: 'node18',
        external: ['vscode', 'sqlite3'],
        sourcemap: true,
        logLevel: 'info',
        tsconfig: 'tsconfig.json',
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
