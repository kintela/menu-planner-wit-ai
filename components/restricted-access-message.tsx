"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface RestrictedAccessMessageProps {
  message?: string
}

export function RestrictedAccessMessage({
  message = "Necesitas iniciar sesión para acceder a esta página",
}: RestrictedAccessMessageProps) {
  const pathname = usePathname()
  const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="mt-4 text-xl font-semibold text-gray-900">Acceso Restringido</CardTitle>
          <CardDescription className="mt-2 text-sm text-gray-600">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href={loginUrl}>Iniciar Sesión</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
