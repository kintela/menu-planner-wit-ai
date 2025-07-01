"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email?: string
}

interface SessionContextType {
  user: User | null
  loading: boolean
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
})

export function useSession() {
  return useContext(SessionContext)
}

export default function SessionWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <SessionContext.Provider value={{ user, loading }}>{children}</SessionContext.Provider>
}
