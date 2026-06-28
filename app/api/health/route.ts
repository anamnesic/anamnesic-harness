import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    healthy: true,
    version: "1.14.30",
    uptime: process.uptime(),
    node: process.version,
    platform: process.platform,
  })
}
