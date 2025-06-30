"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, Info } from "lucide-react"
import { useAuth } from "./auth-provider"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const { isPreview } = useAuth()
  const supabase = createClient()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Handle preview mode
    if (isPreview) {
      setMessage("🔍 Modo preview - La autenticación está deshabilitada en este entorno")
      setTimeout(() => {
        setLoading(false)
        setMessage("En producción, aquí se procesaría la autenticación real con Supabase")
      }, 1500)
      return
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) {
          setError(error.message)
        } else if (data.user && !data.session) {
          setMessage("¡Registro exitoso! Revisa tu email para confirmar tu cuenta.")
        } else if (data.session) {
          router.push("/")
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else if (data.session) {
          router.push("/")
        }
      }
    } catch (err) {
      setError("Error de conexión. Por favor, intenta de nuevo.")
      console.error("Auth error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError("Por favor, ingresa tu email primero")
      return
    }

    if (isPreview) {
      setMessage("🔍 Modo preview - El restablecimiento de contraseña está deshabilitado")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Se ha enviado un enlace de restablecimiento a tu email")
      }
    } catch (err) {
      setError("Error al enviar el email de restablecimiento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp
              ? "Crea tu cuenta para acceder al planificador de menús"
              : "Ingresa tus credenciales para acceder"}
          </CardDescription>
          {isPreview && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                🔍 <strong>Modo Preview:</strong> La autenticación está deshabilitada en este entorno de demostración.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
            </Button>

            <div className="flex flex-col space-y-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={loading}
                className="w-full"
              >
                {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
              </Button>

              {!isSignUp && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetPassword}
                  disabled={loading || !email}
                  className="w-full text-sm"
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
