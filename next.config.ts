import type { NextConfig } from 'next';

const config: NextConfig = {
    output: 'standalone',
    staticPageGenerationTimeout: 60,
    serverExternalPackages: ['typeorm', 'sqlite3', 'reflect-metadata', 'bcrypt', 'node-pty'],
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default config;
