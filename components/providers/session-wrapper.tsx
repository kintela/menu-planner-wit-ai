"use client"

import { SessionProvider } from "next-auth/react"
import { useEffect, useState, type ReactNode } from "react"

interface SessionWrapperProps {
  children: ReactNode
}

export function SessionWrapper({ children }: SessionWrapperProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Intercept fetch requests from NextAuth.js
  useEffect(() => {
    // Store the original fetch function
    const originalFetch = window.fetch

    // Override fetch to intercept NextAuth.js API calls
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url

      // If this is a NextAuth.js API call, return a mock response
      if (url.includes("/api/auth")) {
        console.log("Intercepted NextAuth.js API call:", url)

        // Return a mock session response
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              user: null,
              expires: new Date(Date.now() + 86400000).toISOString(),
            }),
        } as Response)
      }

      // Otherwise, use the original fetch
      return originalFetch.apply(window, [input, init])
    }

    setIsMounted(true)

    // Restore original fetch on cleanup
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // Only render SessionProvider after the fetch override is in place
  if (!isMounted) {
    return <>{children}</>
  }

  return (
    <SessionProvider session={null} refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  )
}
