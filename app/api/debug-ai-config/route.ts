import { NextResponse } from "next/server"

export async function GET() {
  const config = {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "Not set",
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(config)
}
