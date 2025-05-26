"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ChefHat, ArrowLeft } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()

  const redirectTo = searchParams.get("redirect") || "/"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        console.log("🚀 Attempting to sign up with:", email)

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        console.log("✅ Sign up result:", { data, error })

        if (error) {
          console.error("❌ Sign up error:", error)
          throw error
        }

        if (data.user) {
          console.log("🎉 User created successfully:", data.user.id)

          toast({
            title: "¡Cuenta creada exitosamente!",
            description: data.user.email_confirmed_at
              ? "Tu cuenta está lista para usar."
              : "Revisa tu email para confirmar tu cuenta.",
          })

          // Si está confirmado automáticamente, redirigir
          if (data.user.email_confirmed_at) {
            console.log("🔄 Redirecting to:", redirectTo)
            // Esperar un poco para que el estado se actualice
            setTimeout(() => {
              router.push(redirectTo)
              router.refresh()
            }, 1000)
          }
        }
      } else {
        console.log("🔑 Attempting to sign in with:", email)

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        console.log("✅ Sign in result:", { data, error })

        if (error) {
          console.error("❌ Sign in error:", error)
          throw error
        }

        toast({
          title: "¡Bienvenido de vuelta!",
          description: "Has iniciado sesión correctamente. Redirigiendo...",
        })

        console.log("🔄 Redirecting to:", redirectTo)

        // Esperar un momento para que el estado de auth se actualice
        setTimeout(() => {
          router.push(redirectTo)
          router.refresh()
        }, 1500)
      }
    } catch (error: any) {
      console.error("💥 Auth error:", error)
      toast({
        title: "Error de autenticación",
        description: error.message || "Ha ocurrido un error inesperado. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Botón de volver */}
        <Button asChild variant="ghost" className="self-start">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ChefHat className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">{isSignUp ? "Crear cuenta" : "Iniciar sesión"}</CardTitle>
            <CardDescription>
              {isSignUp
                ? "Crea una cuenta para acceder al planificador de menús"
                : "Inicia sesión para acceder a los servicios avanzados"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="roberto.quintela@protonmail.com"
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
            </form>

            <div className="mt-4 text-center">
              <Button type="button" variant="link" onClick={() => setIsSignUp(!isSignUp)} disabled={loading}>
                {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
