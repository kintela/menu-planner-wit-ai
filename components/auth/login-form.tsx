"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (loading) return

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error("[LoginForm] Error al iniciar sesión:", error)
        setError(error.message)
      } else {
        setMessage("¡Inicio de sesión exitoso!")
        // No hacer nada más aquí, dejar que el LoginPage maneje la redirección
      }
    } catch (err) {
      console.error("[LoginForm] Excepción al iniciar sesión:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("Error inesperado al iniciar sesión")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("¡Registro exitoso! Revisa tu email para confirmar tu cuenta.")
      }
    } catch (err) {
      setError("Error inesperado al registrarse")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">MenuPlanner</CardTitle>
          <CardDescription className="text-center">Inicia sesión o crea una cuenta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
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

            <div className="space-y-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Cargando..." : "Iniciar Sesión"}
              </Button>
              <Button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                variant="outline"
                className="w-full bg-transparent"
              >
                {loading ? "Cargando..." : "Crear Cuenta"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
