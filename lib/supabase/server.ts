import { createClient } from "@supabase/supabase-js"

export const createServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Debug: Log para ver qué valores estamos recibiendo
  console.log("🔍 Debug Supabase Server:")
  console.log("URL:", supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : "❌ MISSING")
  console.log("Key:", supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : "❌ MISSING")
  console.log("Environment:", process.env.NODE_ENV)
  console.log("Vercel Env:", process.env.VERCEL_ENV)
  console.log(
    "All NEXT_PUBLIC vars:",
    Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC_")),
  )

  // Validar que las variables existan
  if (!supabaseUrl) {
    throw new Error(
      `❌ NEXT_PUBLIC_SUPABASE_URL is missing. Current value: "${supabaseUrl}". Please check Vercel environment variables and redeploy.`,
    )
  }

  if (!supabaseAnonKey) {
    throw new Error(
      `❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Current value: "${supabaseAnonKey}". Please check Vercel environment variables and redeploy.`,
    )
  }

  // Verificar si son valores placeholder
  if (supabaseUrl.includes("tu_url_de_supabase_aqui") || supabaseUrl.includes("tu-proyecto")) {
    throw new Error(
      `❌ PREVIEW ENVIRONMENT ISSUE: NEXT_PUBLIC_SUPABASE_URL contains placeholder value: "${supabaseUrl}". 
      
      This is a Vercel Preview cache issue. Solutions:
      1. Go to https://vercel.com/dashboard → Your Project → Deployments
      2. Find latest deployment → Click 3 dots (...) → Redeploy
      3. UNCHECK "Use existing Build Cache" 
      4. Click Redeploy
      
      OR make a small change to your code and push to trigger new deployment.
      
      Expected value should be: https://iqarhmetoagfjjyfztzq.supabase.co`,
    )
  }

  if (supabaseAnonKey.includes("tu_clave") || supabaseAnonKey.length < 50) {
    throw new Error(
      `❌ NEXT_PUBLIC_SUPABASE_ANON_KEY contains placeholder value. Please update with real Supabase anon key in Vercel environment variables.`,
    )
  }

  // Validar que la URL sea válida
  try {
    new URL(supabaseUrl)
  } catch (error) {
    throw new Error(
      `❌ Invalid NEXT_PUBLIC_SUPABASE_URL format: "${supabaseUrl}". Expected format: https://your-project.supabase.co`,
    )
  }

  // Validar que la URL tenga el formato correcto de Supabase
  if (!supabaseUrl.includes("supabase.co") && !supabaseUrl.includes("localhost")) {
    throw new Error(
      `❌ Invalid Supabase URL format: "${supabaseUrl}". Expected format: https://your-project.supabase.co`,
    )
  }

  try {
    console.log("✅ Creating Supabase client with valid credentials")
    return createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    throw new Error(
      `❌ Failed to create Supabase client. URL: "${supabaseUrl}", Key length: ${supabaseAnonKey.length}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}
