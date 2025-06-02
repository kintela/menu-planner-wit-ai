import { NextResponse } from "next/server"

export async function GET() {
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    vercelRegion: process.env.VERCEL_REGION,
    nextjsVersion: process.env.npm_package_dependencies_next || "unknown",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "configured" : "missing",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing",
    openaiKey: process.env.OPENAI_API_KEY ? "configured" : "missing",
    headers: {
      host: process.env.VERCEL_URL || "localhost",
      userAgent: "server-side",
    },
  }

  return NextResponse.json(deploymentInfo)
}
