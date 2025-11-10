// Nota: retirado 'server-only' porque Vercel/webpack lo está incluyendo en un contexto pages-like.
// Este módulo debe usarse solo desde código server (páginas/route handlers async en app/).
import { createServerClient as supabaseCreateServerClient } from "@supabase/ssr"
// Importar cookies solo si está disponible (entorno App Router). En build de Vercel puede marcar error si se interpreta fuera de RSC.
let cookiesFn: (() => any) | null = null
try {
  const mod = require("next/headers") as typeof import("next/headers")
  cookiesFn = mod.cookies
} catch {
  cookiesFn = null
}
// Server helper: permite llamada sin pasar cookieStore explícito.

type CookieStore = {
  getAll: () => any
  set: (name: string, value: string, options?: any) => void
}
type CookieToSet = { name: string, value: string, options?: any }

export function createServerClient(cookieStore?: CookieStore) {
  // Intentar obtener cookieStore real de Next si no se pasó
  if (!cookieStore) {
    if (cookiesFn) {
      try {
        const ckResult = cookiesFn()
        if (ckResult && typeof (ckResult as Promise<any>).then === "function") {
          const ckPromise = Promise.resolve(ckResult)
          cookieStore = {
            getAll: () => ckPromise.then((ck) => ck.getAll()),
            set: (name, value, options) => {
              void ckPromise.then((ck) => {
                try {
                  ck.set(name, value, options)
                } catch {
                  // Ignorar fallos de escritura de cookies
                }
              })
            },
          }
        } else {
          const ck = ckResult
          cookieStore = {
            getAll: () => ck?.getAll?.() ?? [],
            set: (name, value, options) => {
              try {
                ck?.set?.(name, value, options)
              } catch {
                // Ignorar fallos de escritura de cookies
              }
            },
          }
        }
      } catch {
        cookieStore = { getAll: () => [], set: () => {} }
      }
    } else {
      cookieStore = { getAll: () => [], set: () => {} }
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
