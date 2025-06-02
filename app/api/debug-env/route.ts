import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    // Validar URL de Supabase
    let urlValid = false
    let urlError = ""
    let isPlaceholder = false

    if (supabaseUrl) {
      // Verificar si es un placeholder
      if (supabaseUrl.includes("tu_url_de_supabase_aqui") || supabaseUrl.includes("tu-proyecto")) {
        isPlaceholder = true
        urlError = "La URL contiene valores placeholder"
      } else {
        try {
          new URL(supabaseUrl)
          urlValid = true
        } catch (error) {
          urlError = error instanceof Error ? error.message : "Invalid URL format"
        }
      }
    }

    // Verificar si la clave de Supabase es placeholder
    let keyIsPlaceholder = false
    if (supabaseKey && (supabaseKey.includes("tu_clave") || supabaseKey.length < 50)) {
      keyIsPlaceholder = true
    }

    // Verificar si la clave de OpenAI es válida
    let openaiValid = false
    let openaiError = ""
    if (openaiKey) {
      if (openaiKey.startsWith("sk-")) {
        openaiValid = true
      } else {
        openaiError = "La clave no tiene el formato correcto (debe empezar por 'sk-')"
      }
    }

    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT SET",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "NOT SET",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "SET" : "NOT SET",
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({
      ...envInfo,
      environment: process.env.NODE_ENV,
      vercel: {
        region: process.env.VERCEL_REGION || "unknown",
        env: process.env.VERCEL_ENV || "unknown",
      },
      supabase: {
        url: {
          exists: !!supabaseUrl,
          value: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "❌ MISSING",
          isPlaceholder,
          isValid: urlValid,
          error: urlError,
          length: supabaseUrl?.length || 0,
        },
        key: {
          exists: !!supabaseKey,
          isPlaceholder: keyIsPlaceholder,
          length: supabaseKey?.length || 0,
          prefix: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : "❌ MISSING",
        },
      },
      openai: {
        exists: !!openaiKey,
        isValid: openaiValid,
        error: openaiError,
        length: openaiKey?.length || 0,
        prefix: openaiKey ? `${openaiKey.substring(0, 7)}...` : "❌ MISSING",
      },
      allEnvVars: {
        supabase: Object.keys(process.env).filter((key) => key.includes("SUPABASE")),
        openai: Object.keys(process.env).filter((key) => key.includes("OPENAI")),
        nextPublic: Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC_")),
      },
      recommendations: [],
    })
  } catch (error) {
    return NextResponse.json({
      error: "Failed to check environment",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    })
  }
}
