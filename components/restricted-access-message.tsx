import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"

interface RestrictedAccessMessageProps {
  message: string
  redirectPath?: string
}

export function RestrictedAccessMessage({ message, redirectPath }: RestrictedAccessMessageProps) {
  // Construir la URL de redirección para el login
  const loginUrl = redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : "/login"

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="mt-4 text-xl font-semibold text-white">Acceso Restringido</CardTitle>
          <CardDescription className="mt-2 text-sm text-gray-300">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-600">
            <Link href={loginUrl}>Iniciar Sesión</Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
