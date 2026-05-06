import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "sqlite3", "reflect-metadata", "bcrypt", "node-pty"],
  typedRoutes: false,
}

export default nextConfig
