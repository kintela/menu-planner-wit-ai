import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Configuración real de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Cliente real de Supabase con configuración mejorada para manejar errores de token
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    // Configuración adicional para manejar errores de refresh token
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key)
        } catch {
          return null
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value)
        } catch {
          // Silently fail if localStorage is not available
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key)
        } catch {
          // Silently fail if localStorage is not available
        }
      },
    },
  },
})

export function createClient() {
  return supabase
}

export function getSupabaseClient() {
  return supabase
}
