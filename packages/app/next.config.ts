import type { NextConfig } from "next"

const isCapacitor = process.env.CAPACITOR_BUILD === 'true'

const nextConfig: NextConfig = {
  output: isCapacitor ? "export" : "standalone",
  distDir: isCapacitor ? undefined : "out",
  staticPageGenerationTimeout: 60,
  serverExternalPackages: isCapacitor ? [] : ["typeorm", "sqlite3", "reflect-metadata", "bcrypt", "node-pty"],
  transpilePackages: ["@kairos/vault"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: isCapacitor ? true : undefined,
  },
}

export default nextConfig
