"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/types"
import { useRouter } from 'next/navigation';
import { runSignOut } from "@/lib/auth-flow/auth-flow"

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })

      if (response.ok) {
        const payload = await response.json()
        if (payload?.profile) {
          return payload.profile as UserProfile
        }
      }
    } catch {
      /* ignore profile fetch errors */
    }

    return null
  }, [])

  // NUEVO: función con reintentos para casos donde el trigger aún no creó la fila
  const loadUserProfileWithRetry = useCallback(async (attempts = [300, 1200, 3000]) => {
    const first = await loadUserProfile()
    if (first) return first
    for (const delay of attempts) {
      await new Promise(r => setTimeout(r, delay))
      const again = await loadUserProfile()
      if (again) return again
    }
    return null
  }, [loadUserProfile])

  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    // Get initial session with error handling
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            const userProfile = await loadUserProfileWithRetry()
            setProfile(userProfile)
          } else {
            setProfile(null)
          }
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      try {
        if (session?.user) {
          setUser(session.user)
          const userProfile = await loadUserProfileWithRetry()
          setProfile(userProfile)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch {
        setUser(null)
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [loadUserProfileWithRetry])

  // NUEVO: suscripción en tiempo real a cambios en user_profiles para el usuario actual (avatar, alias, etc.)
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`user_profile:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${user.id}`,
      }, () => {
        void loadUserProfile().then((nextProfile) => {
          if (nextProfile) setProfile(nextProfile)
        })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadUserProfile, user])

  // Refrescar desde la frontera protegida después de cambios del perfil/avatar.
  useEffect(() => {
    const handler = () => {
      void loadUserProfile().then((nextProfile) => {
        if (nextProfile) setProfile(nextProfile)
      })
    }
    window.addEventListener("profile_updated", handler)
    return () => window.removeEventListener("profile_updated", handler)
  }, [loadUserProfile])

  const signOut = async (): Promise<boolean> => {
    // RF-5: primero se revoca la sesión en el servidor; solo si se completa se
    // limpia la sesión local, el estado de interfaz y se navega a /login.
    return runSignOut({
      requestServerSignOut: async () => {
        const response = await fetch("/api/auth/sign-out", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })
        return response.ok
      },
      clearLocalSession: async () => {
        await supabase.auth.signOut({ scope: "local" })
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-")) {
            localStorage.removeItem(key)
          }
        })
      },
      clearState: () => {
        setUser(null)
        setProfile(null)
        setLoading(false)
      },
      navigateToLogin: () => {
        try {
          router.replace("/login")
          router.refresh()
        } catch {
          window.location.assign("/login")
        }
      },
    })
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>
}
