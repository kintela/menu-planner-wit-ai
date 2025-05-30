"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

import { getSupabaseClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()

  // Buscar tanto "redirect" como "redirectTo" para compatibilidad
  const redirectTo = searchParams.get("redirect") || searchParams.get("redirectTo") || "/"

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (data.user && !data.session) {
          setMessage("¡Registro exitoso! Por favor, revisa tu email para confirmar tu cuenta.")
        } else if (data.session) {
          setMessage("¡Bienvenido! Redirigiendo...")
          setTimeout(() => {
            router.push(redirectTo)
          }, 1000)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.session) {
          setMessage("¡Bienvenido de vuelta! Redirigiendo...")
          setTimeout(() => {
            router.push(redirectTo)
          }, 1000)
        }
      }
    } catch (error: any) {
      setError(error.message || "Error en la autenticación")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4">
        <Button asChild variant="ghost" className="self-start">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>

        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
            </CardTitle>
            <CardDescription className="text-center">
              {isSignUp ? "Crea tu cuenta para comenzar a planificar tus menús" : "Ingresa a tu cuenta para continuar"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
                {isSignUp && (
                  <p className="text-xs text-muted-foreground">La contraseña debe tener al menos 6 caracteres</p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {message && (
                <Alert>
                  <AlertDescription className="text-green-600">{message}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignUp ? "Creando cuenta..." : "Iniciando sesión..."}
                  </>
                ) : isSignUp ? (
                  "Crear cuenta"
                ) : (
                  "Iniciar sesión"
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError(null)
                    setMessage(null)
                  }}
                  disabled={loading}
                >
                  {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
