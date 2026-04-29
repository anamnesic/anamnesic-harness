import type { NextConfig } from 'next';

const config: NextConfig = {
    output: 'export',
    distDir: 'out',
    staticPageGenerationTimeout: 60,
    serverExternalPackages: ['typeorm', 'sqlite3', 'reflect-metadata', 'bcrypt', 'node-pty'],
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default config;
