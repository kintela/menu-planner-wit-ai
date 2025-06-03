import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        if (typeof document === "undefined") return undefined

        try {
          const value = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${name}=`))
            ?.split("=")[1]

          return value ? decodeURIComponent(value) : undefined
        } catch (error) {
          console.warn(`Error reading cookie ${name}:`, error)
          return undefined
        }
      },
      set(name: string, value: string, options: any) {
        if (typeof document === "undefined") return

        try {
          const cookieOptions = {
            ...options,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          }

          let cookieString = `${name}=${encodeURIComponent(value)}`

          if (cookieOptions.maxAge) {
            cookieString += `; Max-Age=${cookieOptions.maxAge}`
          }
          if (cookieOptions.path) {
            cookieString += `; Path=${cookieOptions.path}`
          }
          if (cookieOptions.domain) {
            cookieString += `; Domain=${cookieOptions.domain}`
          }
          if (cookieOptions.sameSite) {
            cookieString += `; SameSite=${cookieOptions.sameSite}`
          }
          if (cookieOptions.secure) {
            cookieString += `; Secure`
          }

          document.cookie = cookieString
        } catch (error) {
          console.warn(`Error setting cookie ${name}:`, error)
        }
      },
      remove(name: string, options: any) {
        if (typeof document === "undefined") return

        try {
          this.set(name, "", { ...options, maxAge: 0 })
        } catch (error) {
          console.warn(`Error removing cookie ${name}:`, error)
        }
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })
}
