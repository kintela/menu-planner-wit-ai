import { createServerClient as supabaseCreateServerClient } from "@supabase/ssr"
// This file should only be used in Server Components or API routes.
// Move the cookies() usage to the calling Server Component or API route and pass cookies as a parameter if needed.

type CookieStore = {
  getAll: () => any
  set: (name: string, value: string, options?: any) => void
}
type CookieToSet = { name: string, value: string, options?: any }

export function createServerClient(cookieStore: CookieStore) {
  return supabaseCreateServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Export for backward compatibility
export const createSupabaseClient = createServerClient
