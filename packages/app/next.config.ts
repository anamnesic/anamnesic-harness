import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: "out",
  staticPageGenerationTimeout: 60,
  serverExternalPackages: ["typeorm", "sqlite3", "reflect-metadata", "bcrypt", "node-pty"],
  transpilePackages: ["@kairos/vault"],
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
