import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth/auth-provider"
import { SimpleNavigation } from "@/components/simple-navigation"
import { SessionProvider } from "next-auth/react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Planificador de Menús Semanales",
  description: "Planifica tus comidas y cenas semanales de manera sencilla",
  generator: "v0.dev",
}

// Wrapper component to catch and suppress NextAuth errors
function SafeSessionProvider({ children }: { children: React.ReactNode }) {
  try {
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
  } catch (error) {
    // If SessionProvider fails, just render children without it
    console.warn("SessionProvider failed, continuing without it:", error)
    return <>{children}</>
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SafeSessionProvider>
            <AuthProvider>
              <div className="flex min-h-screen flex-col">
                <SimpleNavigation />
                <main className="flex-1">{children}</main>
              </div>
              <Toaster />
            </AuthProvider>
          </SafeSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
