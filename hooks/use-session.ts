"use client"

import { useAuth } from "@/components/auth/auth-provider"

// Custom useSession hook that uses Supabase auth but mimics NextAuth.js interface
export function useSession() {
  const { user, loading } = useAuth()

  const session = user
    ? {
        user: {
          id: user.id,
          email: user.email || undefined,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || undefined,
          image: user.user_metadata?.avatar_url || undefined,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      }
    : null

  const status = loading ? "loading" : user ? "authenticated" : "unauthenticated"

  return {
    data: session,
    status,
    update: async () => session,
  }
}
