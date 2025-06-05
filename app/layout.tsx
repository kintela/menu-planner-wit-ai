import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth/auth-provider"
import SimpleNavigation from "@/components/simple-navigation"
import SessionWrapper from "@/components/providers/session-wrapper"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
})

export const metadata: Metadata = {
  title: "Planificador de Menús Semanales",
  description: "Planifica tus comidas y cenas semanales de manera sencilla",
  generator: "v0.dev",
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={inter.className}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SessionWrapper>
            <AuthProvider>
              <div className="flex min-h-screen flex-col">
                <SimpleNavigation />
                <main className="flex-1">{children}</main>
              </div>
              <Toaster />
            </AuthProvider>
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
