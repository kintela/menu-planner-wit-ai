"use client"

import { useAuth } from "@/components/auth/auth-provider"

export function useSession() {
  const { user, profile, loading } = useAuth()

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
  }
}
