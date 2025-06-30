"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        // Registro
        if (password.length < 6) {
          throw new Error("La contraseña debe tener al menos 6 caracteres")
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (data.user && !data.user.email_confirmed_at) {
          toast({
            title: "¡Cuenta creada!",
            description: "Revisa tu email para confirmar tu cuenta antes de iniciar sesión.",
          })
        } else {
          toast({
            title: "¡Cuenta creada!",
            description: "Tu cuenta ha sido creada exitosamente.",
          })
          router.push("/")
        }
      } else {
        // Inicio de sesión
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente.",
        })
        router.push("/")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error inesperado",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Crea una nueva cuenta para acceder al planificador de menús"
            : "Ingresa tus credenciales para acceder a tu cuenta"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder={isSignUp ? "Mínimo 6 caracteres" : "Tu contraseña"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? isSignUp
                ? "Creando cuenta..."
                : "Iniciando sesión..."
              : isSignUp
                ? "Crear Cuenta"
                : "Iniciar Sesión"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="text-sm">
            {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Créala aquí"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
