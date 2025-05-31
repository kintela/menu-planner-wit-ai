"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

// Define types similar to NextAuth.js
type User = {
  id?: string
  name?: string
  email?: string
  image?: string
}

type Session = {
  user: User
  expires: string
}

type SessionContextValue = {
  data: Session | null
  status: "loading" | "authenticated" | "unauthenticated"
  update: (data?: Session | null) => Promise<Session | null>
}

// Create context
const SessionContext = createContext<SessionContextValue>({
  data: null,
  status: "loading",
  update: async () => null,
})

// Custom SessionProvider that doesn't make any API calls
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  useEffect(() => {
    // Set a fake session after a short delay to simulate loading
    const timer = setTimeout(() => {
      setStatus("unauthenticated")
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const update = async (data?: Session | null) => {
    if (data) {
      setSession(data)
      setStatus("authenticated")
      return data
    }
    setSession(null)
    setStatus("unauthenticated")
    return null
  }

  return <SessionContext.Provider value={{ data: session, status, update }}>{children}</SessionContext.Provider>
}

// Custom useSession hook that mimics NextAuth.js useSession
export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return {
    data: context.data,
    status: context.status,
    update: context.update,
  }
}
