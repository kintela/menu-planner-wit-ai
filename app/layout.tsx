import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionWrapper } from "@/components/providers/session-wrapper"
import { SimpleNavigation } from "@/components/simple-navigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Menu Planner AI",
  description: "Planifica tus menús semanales con ayuda de la inteligencia artificial",
  keywords: ["menú", "planificación", "recetas", "cocina", "IA", "inteligencia artificial"],
  authors: [{ name: "Menu Planner AI Team" }],
  viewport: "width=device-width, initial-scale=1",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <SessionWrapper>
          <div className="min-h-screen bg-gray-50">
            <SimpleNavigation />
            <main className="pb-16 md:pb-0">{children}</main>
          </div>
        </SessionWrapper>
      </body>
    </html>
  )
}
