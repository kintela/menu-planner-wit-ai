"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [resetEmail, setResetEmail] = useState("")
  const [showReset, setShowReset] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = getSupabaseClient()

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        })

        if (error) {
          setError(error.message)
        } else if (data.user && !data.session) {
          setMessage("¡Registro exitoso! Revisa tu email para confirmar tu cuenta.")
        } else if (data.session) {
          router.push(redirectTo)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else if (data.session) {
          router.push(redirectTo)
        }
      }
    } catch (err) {
      console.error("Auth error:", err)
      setError("Ha ocurrido un error inesperado")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Se ha enviado un enlace de recuperación a tu email.")
        setShowReset(false)
        setResetEmail("")
      }
    } catch (err) {
      console.error("Reset password error:", err)
      setError("Ha ocurrido un error al enviar el email de recuperación")
    } finally {
      setResetLoading(false)
    }
  }

  if (showReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Recuperar Contraseña</CardTitle>
            <CardDescription>Introduce tu email para recibir un enlace de recuperación</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
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

              <div className="flex gap-2">
                <Button type="submit" disabled={resetLoading} className="flex-1">
                  {resetLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar enlace"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowReset(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}</CardTitle>
          <CardDescription>
            {isSignUp ? "Crea una nueva cuenta para acceder al planificador de menús" : "Inicia sesión en tu cuenta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
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
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
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

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? "Creando cuenta..." : "Iniciando sesión..."}
                </>
              ) : (
                <>{isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}</>
              )}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
              </button>

              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="block w-full text-sm text-gray-600 hover:text-gray-500"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>

            <div className="text-center">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-500">
                Volver al inicio
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
