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
          console.log("[AuthProvider] Perfil cargado desde API", payload.profile)
          return payload.profile as UserProfile
        }
      } else {
        console.warn("[AuthProvider] /api/profile respondió", response.status)
      }
    } catch (apiError) {
      console.warn("[AuthProvider] Error llamando a /api/profile:", apiError)
    }

    try {
      let token = accessToken
      if (!token) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          token = session?.access_token ?? null
        } catch (sessionError) {
          console.warn("[AuthProvider] No se pudo obtener access token para fallback:", sessionError)
        }
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        console.error("[AuthProvider] Error loading user profile (client):", error)
        return null
      }

      if (data) {
        console.log("[AuthProvider] Perfil cargado desde Supabase client", data)
      } else {
        console.warn("[AuthProvider] Supabase client devolvió perfil vacío")
      }

      return data
    } catch (error) {
      console.error("[AuthProvider] Error loading user profile (client exception):", error)
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

    // Log para depuración
    console.log("[AuthProvider] Montado. Estado inicial: loading=true, user=null")

    // Get initial session with error handling
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
        }

        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            const userProfile = await loadUserProfileWithRetry(session.user.id, session?.access_token ?? null)
            setProfile(userProfile)
          } else {
            setProfile(null)
          }
          setLoading(false)
          console.log("[AuthProvider] getInitialSession: loading=false, user=", session?.user)
        }
      } catch (error) {
        console.error("Error in getInitialSession:", error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          console.log("[AuthProvider] getInitialSession: loading=false, user=null (error)")
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      try {
        if (session?.user) {
          setUser(session.user)
          const userProfile = await loadUserProfileWithRetry(session.user.id, session?.access_token ?? null)
          setProfile(userProfile)
          console.log("[AuthProvider] onAuthStateChange: user=", session.user)
        } else {
          setUser(null)
          setProfile(null)
          console.log("[AuthProvider] onAuthStateChange: user=null")
        }
      } catch (error) {
        console.error("Error in auth state change:", error)
        setUser(null)
        setProfile(null)
        console.log("[AuthProvider] onAuthStateChange: user=null (error)")
      }

      setLoading(false)
      console.log("[AuthProvider] onAuthStateChange: loading=false")
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
      console.log("[AuthProvider] Desmontado")
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
        console.log('[AuthProvider] RT cambio perfil:', payload)
        const newRecord = payload.new || payload.old
        setProfile(prev => prev ? { ...prev, ...newRecord } : newRecord)
      })
      .subscribe((status) => {
        console.log('[AuthProvider] Canal realtime status:', status)
      })
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
        .catch((error) => {
          console.warn("[AuthProvider] Error cargando perfil tras user change:", error)
        })
    } else {
      setProfile(null)
    }
  }, [user])

  const signOut = async () => {
    console.log("[AuthProvider] Iniciando signOut...")

    // Actualizar UI inmediatamente
    setUser(null)
    setProfile(null)
    setLoading(false)
    console.log("[AuthProvider] Estado preliminar tras signOut -> user=null, profile=null")

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        console.warn("[AuthProvider] sign-out API respondió error:", payload)
      } else {
        console.log("[AuthProvider] API sign-out completado")
      }
    } catch (apiError) {
      console.warn("[AuthProvider] Error llamando al API sign-out:", apiError)
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("[AuthProvider] Error en signOut local:", error)
      } else {
        console.log("[AuthProvider] supabase.auth.signOut completado")
      }
    } catch (error) {
      console.error("[AuthProvider] Excepción en signOut local:", error)
    }

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key)
        }
      })
    } catch (storageError) {
      console.warn("[AuthProvider] No se pudieron limpiar tokens de Supabase:", storageError)
    }

    console.log("[AuthProvider] Redirigiendo a /login tras signOut")
    try {
      router.replace("/login")
      router.refresh()
    } catch (navigationError) {
      console.warn("[AuthProvider] Error usando router.replace, haciendo fallback a location.assign", navigationError)
      window.location.assign("/login")
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>
}
