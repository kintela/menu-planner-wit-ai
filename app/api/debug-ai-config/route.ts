import { NextResponse } from "next/server"

export async function GET() {
  const config = {
    openai_key_exists: !!process.env.OPENAI_API_KEY,
    openai_key_length: process.env.OPENAI_API_KEY?.length || 0,
    supabase_url_exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon_key_exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(config)
}
