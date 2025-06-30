import { createBrowserClient } from "@supabase/ssr"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Check if we're in a preview environment
  const isPreview =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("v0.dev") || window.location.hostname.includes("vusercontent.net"))

  if (isPreview) {
    console.warn("🔍 Preview environment detected - Supabase client not initialized")
    throw new Error("Supabase not available in preview environment")
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Faltan variables de entorno de Supabase")
    throw new Error("Faltan variables de entorno de Supabase")
  }

  try {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      global: {
        headers: {
          "x-client-info": `menu-planner@1.0.0`,
        },
      },
    })

    return supabaseClient
  } catch (error) {
    console.error("❌ Error al crear cliente Supabase:", error)
    throw error
  }
}

// Alias para compatibilidad con código existente
export function getSupabaseClient() {
  return createClient()
}
