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
  const router = useRouter();

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

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
            const userProfile = await loadUserProfile(session.user.id)
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
          const userProfile = await loadUserProfile(session.user.id)
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

  useEffect(() => {
    if (user) {
      loadUserProfile(user.id).then(setProfile)
    } else {
      setProfile(null)
    }
  }, [user])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      router.push('/login'); // Redirigir al usuario a la página de inicio de sesión
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, signOut }}>{children}</AuthContext.Provider>
}
