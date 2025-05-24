import { createClient } from "@supabase/supabase-js"

// Crear un singleton para el cliente de Supabase en el lado del cliente
let supabaseClient: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Debug: Log para ver qué valores estamos recibiendo
    console.log("🔍 Debug Supabase Client:")
    console.log("URL:", supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "❌ MISSING")
    console.log("Key:", supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : "❌ MISSING")

    if (!supabaseUrl) {
      throw new Error(`❌ NEXT_PUBLIC_SUPABASE_URL is missing. Please check Vercel environment variables and redeploy.`)
    }

    if (!supabaseAnonKey) {
      throw new Error(
        `❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Please check Vercel environment variables and redeploy.`,
      )
    }

    // Verificar si son valores placeholder
    if (supabaseUrl.includes("tu_url_de_supabase_aqui") || supabaseUrl.includes("tu-proyecto")) {
      throw new Error(
        `❌ NEXT_PUBLIC_SUPABASE_URL contains placeholder: "${supabaseUrl}". Update in Vercel and redeploy.`,
      )
    }

    // Validar que la URL sea válida
    try {
      new URL(supabaseUrl)
    } catch (error) {
      throw new Error(`❌ Invalid NEXT_PUBLIC_SUPABASE_URL: "${supabaseUrl}". Please check that it's a valid URL.`)
    }

    try {
      console.log("✅ Creating Supabase client")
      console.log("URL válida:", !!supabaseUrl && supabaseUrl.startsWith("https://"))
      console.log("Key válida:", !!supabaseAnonKey && supabaseAnonKey.length > 100)
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    } catch (error) {
      throw new Error(
        `❌ Failed to create Supabase client: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }

  return supabaseClient
}
