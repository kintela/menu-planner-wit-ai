import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface RestrictedAccessMessageProps {
  message: string
  redirectPath?: string
}

export function RestrictedAccessMessage({ message, redirectPath }: RestrictedAccessMessageProps) {
  return (
    <div className="container py-10">
      <div className="max-w-md mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-amber-100 rounded-full p-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Acceso Restringido</h2>
          <p className="text-amber-700 mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href={`/login${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ""}`}>
                Iniciar Sesión
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
