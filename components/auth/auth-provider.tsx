"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    // Función para inicializar la sesión
    const initSession = async () => {
      try {
        // Primero intentamos recuperar la sesión existente
        const { data: sessionData } = await supabase.auth.getSession()

        if (sessionData?.session) {
          // Si hay sesión, obtenemos el usuario
          const { data: userData, error: userError } = await supabase.auth.getUser()

          if (userError) {
            console.warn("Error al obtener usuario con sesión existente:", userError.message)
            setError(userError)
            setUser(null)
          } else {
            setUser(userData.user)
            setError(null)
          }
        } else {
          // No hay sesión activa
          setUser(null)
        }
      } catch (err) {
        console.warn("Error al inicializar sesión:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    // Inicializar sesión
    initSession()

    // Configurar listener para cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔐 Cambio de estado de autenticación:", event)

      if (session) {
        setUser(session.user)
        setError(null)
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    // Limpiar al desmontar
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return <AuthContext.Provider value={{ user, loading, error }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}
