"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

interface SessionWrapperProps {
  children: ReactNode
}

export function SessionWrapper({ children }: SessionWrapperProps) {
  return (
    <SessionProvider
      session={null}
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      basePath="/api/auth-disabled"
    >
      {children}
    </SessionProvider>
  )
}
