import { createServerClient as supabaseCreateServerClient } from "@supabase/ssr"
import { cookies } from 'next/headers'
// Server helper: permite llamada sin pasar cookieStore explícito.

type CookieStore = {
  getAll: () => any
  set: (name: string, value: string, options?: any) => void
}
type CookieToSet = { name: string, value: string, options?: any }

export function createServerClient(cookieStore?: CookieStore) {
  // Intentar obtener cookieStore real de Next si no se pasó
  if (!cookieStore) {
    try {
      const ck = cookies()
      cookieStore = {
        getAll: () => ck.getAll(),
        set: (name, value, options) => ck.set(name, value, options),
      }
    } catch {
      // SSR context no disponible (tests), usar mock silencioso
      cookieStore = {
        getAll: () => [],
        set: () => {},
      }
    }
  }

  return supabaseCreateServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore!.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore!.set(name, value, options) } catch { /* ignore */ }
          })
        },
      },
    },
  )
}

// Export for backward compatibility
export const createSupabaseClient = createServerClient
export const createClient = createServerClient
