import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    return NextResponse.json({
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 7) || "none",
      allEnvVars: Object.keys(process.env).filter((key) => key.includes("OPENAI") || key.includes("SUPABASE")),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to check environment" })
  }
}
