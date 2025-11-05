"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/types"
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadUserProfile = async (userId: string, accessToken?: string | null) => {
    try {
      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
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

    try {
      let token = accessToken
      if (!token) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          token = session?.access_token ?? null
        } catch {
          /* ignore session token errors */
        }
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        return null
      }

      return data ?? null
    } catch {
      return null
    }
  }

  // NUEVO: función con reintentos para casos donde el trigger aún no creó la fila
  const loadUserProfileWithRetry = async (userId: string, accessToken?: string | null, attempts = [300, 1200, 3000, 5000, 8000]) => {
    const first = await loadUserProfile(userId, accessToken)
    if (first) return first
    for (const delay of attempts) {
      await new Promise(r => setTimeout(r, delay))
      const again = await loadUserProfile(userId, accessToken)
      if (again) return again
    }
    return null
  }

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
            const userProfile = await loadUserProfileWithRetry(session.user.id, session?.access_token ?? null)
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
          const userProfile = await loadUserProfileWithRetry(session.user.id, session?.access_token ?? null)
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
  }, [])

  // NUEVO: suscripción en tiempo real a cambios en user_profiles para el usuario actual (avatar, alias, etc.)
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`user_profile:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${user.id}`,
      }, (payload: any) => {
        const newRecord = payload.new || payload.old
        setProfile(prev => prev ? { ...prev, ...newRecord } : newRecord)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // NUEVO: listener para evento custom disparado desde el formulario al subir avatar
  useEffect(() => {
    const handler = (e: any) => {
      const { avatarUrl, fullName } = e.detail || {}
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl || prev.avatar_url, full_name: fullName || prev.full_name } : prev)
    }
    window.addEventListener('avatar_updated', handler as EventListener)
    return () => window.removeEventListener('avatar_updated', handler as EventListener)
  }, [])

  useEffect(() => {
    if (user) {
      supabase.auth.getSession()
        .then(({ data }) => loadUserProfileWithRetry(user.id, data.session?.access_token ?? null))
        .then((p) => p && setProfile(p))
        .catch(() => {})
    } else {
      setProfile(null)
    }
  }, [user])

  const signOut = async () => {
    // Actualizar UI inmediatamente
    setUser(null)
    setProfile(null)
    setLoading(false)

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        await response.json().catch(() => ({}))
      }
    } catch {
      /* ignore sign-out API errors */
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    } catch {
      /* ignore Supabase sign-out errors */
    }

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key)
        }
      })
    } catch {
      /* ignore storage cleanup errors */
    }

    try {
      router.replace("/login")
      router.refresh()
    } catch {
      window.location.assign("/login")
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>
}
