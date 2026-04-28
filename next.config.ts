import type { NextConfig } from 'next';

const config: NextConfig = {
    serverExternalPackages: ['typeorm', 'sqlite3', 'reflect-metadata', 'bcrypt', 'node-pty'],
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default config;
