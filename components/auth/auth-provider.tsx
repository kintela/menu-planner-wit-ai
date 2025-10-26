"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
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
  const signingOutRef = useRef(false)

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        console.error("Error loading user profile:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error loading user profile:", error)
      return null
    }
  }

  // NUEVO: función con reintentos para casos donde el trigger aún no creó la fila
  const loadUserProfileWithRetry = async (userId: string, attempts = [300, 1200, 3000, 5000, 8000]) => {
    const first = await loadUserProfile(userId)
    if (first) return first
    for (const delay of attempts) {
      await new Promise(r => setTimeout(r, delay))
      const again = await loadUserProfile(userId)
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
            const userProfile = await loadUserProfileWithRetry(session.user.id)
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

      if (signingOutRef.current && event !== "SIGNED_OUT") {
        console.log("[AuthProvider] Ignorando evento auth durante signOut:", event)
        return
      }

      try {
        if (session?.user) {
          setUser(session.user)
          const userProfile = await loadUserProfileWithRetry(session.user.id)
          setProfile(userProfile)
          console.log("[AuthProvider] onAuthStateChange: user=", session.user)
        } else {
          setUser(null)
          setProfile(null)
          if (signingOutRef.current) {
            console.log("[AuthProvider] Evento SIGNED_OUT recibido")
            signingOutRef.current = false
          }
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
      loadUserProfile(user.id).then(p => p && setProfile(p))
    } else {
      setProfile(null)
    }
  }, [user])

  const signOut = async () => {
    console.log("[AuthProvider] Iniciando signOut...")

    // Actualizar UI inmediatamente
    signingOutRef.current = true
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

    signingOutRef.current = false
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
