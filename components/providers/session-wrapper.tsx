"use client"

import type { ReactNode } from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"

interface SessionContextType {
  user: User | null
  loading: boolean
}

interface SessionWrapperProps {
  children: ReactNode
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
})

export default function SessionWrapper({ children }: SessionWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
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

export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionWrapper")
  }
  return context
}
