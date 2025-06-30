"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Mail, Lock, User, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("login")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"
  const supabase = createClient()

  const handleEmailAuth = async (formData: FormData, isSignUp: boolean) => {
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const email = formData.get("email") as string
      const password = formData.get("password") as string
      const fullName = formData.get("fullName") as string

      if (!email || !password) {
        setError("Por favor, completa todos los campos requeridos")
        return
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split("@")[0],
            },
          },
        })

        if (error) {
          setError(error.message)
        } else if (data.user && !data.user.email_confirmed_at) {
          setMessage("¡Registro exitoso! Revisa tu email para confirmar tu cuenta.")
          setActiveTab("login")
        } else {
          setMessage("¡Cuenta creada exitosamente!")
          router.push(redirectTo)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else {
          setMessage("¡Inicio de sesión exitoso!")
          router.push(redirectTo)
        }
      }
    } catch (err) {
      setError("Error inesperado. Por favor, inténtalo de nuevo.")
      console.error("Auth error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (formData: FormData) => {
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const email = formData.get("email") as string

      if (!email) {
        setError("Por favor, ingresa tu email")
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage("Se ha enviado un enlace de recuperación a tu email")
      }
    } catch (err) {
      setError("Error al enviar el email de recuperación")
      console.error("Password reset error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Menu Planner AI</CardTitle>
          <CardDescription>Accede a tu cuenta para gestionar tus menús</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
              <TabsTrigger value="reset">Recuperar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleEmailAuth(new FormData(e.currentTarget), false)
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleEmailAuth(new FormData(e.currentTarget), true)
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo (opcional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Tu nombre completo"
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear Cuenta"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="reset" className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handlePasswordReset(new FormData(e.currentTarget))
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar enlace de recuperación"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
