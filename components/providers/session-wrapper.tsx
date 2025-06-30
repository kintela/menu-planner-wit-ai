"use client"

import { SessionProvider } from "next-auth/react"
import type React from "react"

export default function SessionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider session={null} refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  )
}
