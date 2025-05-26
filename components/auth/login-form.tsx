"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { getSupabaseClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ChefHat } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        toast({
          title: "¡Cuenta creada!",
          description: "Revisa tu email para confirmar tu cuenta.",
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
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
        description: error.message || "Ha ocurrido un error inesperado.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <ChefHat className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl">{isSignUp ? "Crear cuenta" : "Iniciar sesión"}</CardTitle>
        <CardDescription>
          {isSignUp
            ? "Crea una cuenta para acceder al planificador de menús"
            : "Accede a tu planificador de menús personal"}
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
  )
}
