import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Configuración real de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseAnonKey) {
  // Advertir claramente si faltan variables
  // eslint-disable-next-line no-console
  console.error("[Supabase] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Auth fallará.")
}

let _supabaseHealth: { status: 'unknown' | 'ok' | 'error'; lastChecked: number; error?: string } = {
  status: 'unknown',
  lastChecked: Date.now(),
}

async function checkSupabaseHealth() {
  if (typeof window === 'undefined') return _supabaseHealth
  if (!supabaseUrl) return _supabaseHealth
  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, { signal: controller.signal })
    clearTimeout(tid)
    if (res.ok) {
      _supabaseHealth = { status: 'ok', lastChecked: Date.now() }
    } else {
      _supabaseHealth = { status: 'error', lastChecked: Date.now(), error: `HTTP ${res.status}` }
      // eslint-disable-next-line no-console
      console.warn('[Supabase] Health check no OK:', res.status)
    }
  } catch (e: any) {
    _supabaseHealth = { status: 'error', lastChecked: Date.now(), error: e?.message || 'fetch failed' }
    // eslint-disable-next-line no-console
    console.warn('[Supabase] Health check error:', e)
  }
  return _supabaseHealth
}

// Lanzar health check inicial (no bloqueante)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  checkSupabaseHealth()
  // Re-chequear cada minuto de forma ligera
  setInterval(() => { void checkSupabaseHealth() }, 60_000)
}

export function getSupabaseHealth() {
  return _supabaseHealth
}

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
