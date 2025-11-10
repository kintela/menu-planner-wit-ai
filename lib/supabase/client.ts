// IMPORTANT: Para que el servidor reconozca la sesión necesitamos
// que el cliente gestione tokens también vía cookies. Esto lo hace
// createBrowserClient de @supabase/ssr. Antes usábamos supabase-js puro
// (solo localStorage) y el servidor nunca veía la sesión => redirect loop.

import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Auth fallará.")
}

// En el navegador NO pasamos objeto cookies: createBrowserClient ya usa document.cookie
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export function createClient() { return supabase }
export function getSupabaseClient() { return supabase }

// Utilidad mínima para compatibilidad con código previo
export function getSupabaseHealth() {
  return { status: 'ok', lastChecked: Date.now() }
}
