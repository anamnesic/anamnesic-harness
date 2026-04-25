import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['typeorm', 'sqlite3', 'reflect-metadata', 'bcrypt'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
