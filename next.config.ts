import type { NextConfig } from 'next';

const config: NextConfig = {
    serverExternalPackages: ['typeorm', 'sqlite3', 'reflect-metadata', 'bcrypt'],
    experimental: {
        // Allow importing server-only modules (TypeORM entities) in route handlers
    },
};

export default config;
