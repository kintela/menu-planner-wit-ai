"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Clock } from "lucide-react"

import { getSupabaseClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const [resetCooldown, setResetCooldown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()

  // Buscar tanto "redirect" como "redirectTo" para compatibilidad
  const redirectTo = searchParams.get("redirect") || searchParams.get("redirectTo") || "/"

  useEffect(() => {
    const error = searchParams.get("error")
    const message = searchParams.get("message")
    const errorDescription = searchParams.get("error_description")

    if (error === "missing_code") {
      setError("El enlace de recuperación no es válido o ha expirado. Por favor, solicita uno nuevo.")
    } else if (error === "recovery_expired") {
      setError("El enlace de recuperación ha expirado. Por favor, solicita uno nuevo.")
    } else if (error === "recovery_error") {
      setError(message || "Error en la recuperación de contraseña. Solicita un nuevo enlace.")
    } else if (error && errorDescription) {
      setError(decodeURIComponent(errorDescription))
    } else if (message) {
      setError(decodeURIComponent(message))
    }
  }, [searchParams])

  // Countdown para el cooldown
  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => {
        setResetCooldown(resetCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resetCooldown])

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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })

      if (error) {
        // Manejar específicamente el error de rate limit
        if (error.message.includes("rate limit") || error.message.includes("too many requests")) {
          setError(
            "Has excedido el límite de emails de recuperación. Por favor, espera 60 segundos antes de intentar de nuevo.",
          )
          setResetCooldown(60)
        } else {
          throw error
        }
      } else {
        setMessage(
          "Te hemos enviado un enlace de recuperación a tu email. El enlace expira en 1 hora. Revisa tu bandeja de entrada y spam.",
        )
        setIsResetMode(false)
        // Establecer un cooldown preventivo
        setResetCooldown(60)
      }
    } catch (error: any) {
      if (error.message.includes("rate limit") || error.message.includes("too many requests")) {
        setError(
          "Has excedido el límite de emails de recuperación. Por favor, espera unos minutos antes de intentar de nuevo.",
        )
        setResetCooldown(60)
      } else {
        setError(error.message || "Error al enviar el email de recuperación")
      }
    } finally {
      setLoading(false)
    }
  }

  const isResetDisabled = loading || resetCooldown > 0

  return (
    <div className="min-h-screen flex flex-col justify-start bg-gray-50 pt-8 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button asChild variant="ghost" className="self-start">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">
            {isResetMode ? "Recuperar contraseña" : isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isResetMode
              ? "Introduce tu email para recibir un enlace de recuperación"
              : isSignUp
                ? "Crea tu cuenta para comenzar a planificar tus menús"
                : "Accede a Menu Planner AI para gestionar tus recetas y menús"}
          </p>
        </div>

        <Card className="w-full">
          <CardContent className="pt-6">
            <form onSubmit={isResetMode ? handlePasswordReset : handleEmailAuth} className="space-y-4">
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

              {!isResetMode && (
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
              )}

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

              {resetCooldown > 0 && isResetMode && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Puedes solicitar otro email de recuperación en {resetCooldown} segundos.
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isResetMode ? isResetDisabled : loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isResetMode ? "Enviando..." : isSignUp ? "Creando cuenta..." : "Iniciando sesión..."}
                  </>
                ) : isResetMode && resetCooldown > 0 ? (
                  `Esperar ${resetCooldown}s`
                ) : isResetMode ? (
                  "Enviar enlace de recuperación"
                ) : isSignUp ? (
                  "Crear cuenta"
                ) : (
                  "Iniciar sesión"
                )}
              </Button>

              <div className="text-center space-y-2">
                {!isResetMode && (
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
                )}

                <div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      setIsResetMode(!isResetMode)
                      setError(null)
                      setMessage(null)
                      setPassword("")
                      setResetCooldown(0)
                    }}
                    disabled={loading}
                    className="text-sm"
                  >
                    {isResetMode ? "Volver al login" : "¿Olvidaste tu contraseña?"}
                  </Button>
                </div>
              </div>

              {isResetMode && (
                <div className="text-xs text-muted-foreground text-center mt-4 space-y-1">
                  <p>• Solo puedes solicitar 1 email cada 60 segundos</p>
                  <p>• Máximo 5 intentos por hora por seguridad</p>
                  <p>• Revisa también tu carpeta de spam</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
