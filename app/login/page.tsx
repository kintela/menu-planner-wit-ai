"use client"

import { useAuth } from "@/components/auth/auth-provider"
import LoginForm from "@/components/auth/login-form"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  useEffect(() => {
    if (!loading && user) {
      console.log("✅ Usuario ya autenticado, redirigiendo a:", redirectTo)
      router.push(redirectTo)
    }
  }, [user, loading, redirectTo, router])

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">{loading ? "Verificando autenticación..." : "¡Ya estás autenticado!"}</p>
          {user && <p className="text-sm text-muted-foreground">Redirigiendo...</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">Iniciar Sesión</h1>
        <LoginForm />
      </div>
    </div>
  )
}
