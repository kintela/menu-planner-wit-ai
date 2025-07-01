"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
}

interface SessionContextType {
  user: User | null
  loading: boolean
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
})

interface SessionWrapperProps {
  children: ReactNode
}

export default function SessionWrapper({ children }: SessionWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email || "" } : null)
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email || "" } : null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <SessionContext.Provider value={{ user, loading }}>{children}</SessionContext.Provider>
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionWrapper")
  }
  return context
}
