import { NextResponse } from "next/server"

export async function GET() {
  const config = {
    openai_configured: !!process.env.OPENAI_API_KEY,
    openai_key_length: process.env.OPENAI_API_KEY?.length || 0,
    openai_key_prefix: process.env.OPENAI_API_KEY?.substring(0, 7) || "not_set",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(config)
}
