"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase/client"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (isLogin) {
        // Iniciar sesión
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else {
          router.push("/")
        }
      } else {
        // Registrarse
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else {
          setSuccess("¡Cuenta creada! Revisa tu email para confirmar tu cuenta.")
        }
      }
    } catch (err) {
      setError(isLogin ? "Error al iniciar sesión" : "Error al crear la cuenta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{isLogin ? "Iniciar Sesión" : "Crear Cuenta"}</h1>
        <p className="text-gray-600 mt-2">{isLogin ? "Accede a tu cuenta" : "Crea una nueva cuenta"}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={6}
          />
          {!isLogin && <p className="text-sm text-gray-500">Mínimo 6 caracteres</p>}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? isLogin
              ? "Iniciando sesión..."
              : "Creando cuenta..."
            : isLogin
              ? "Iniciar Sesión"
              : "Crear Cuenta"}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin)
            setError("")
            setSuccess("")
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isLogin ? "¿No tienes cuenta? Crear una nueva" : "¿Ya tienes cuenta? Iniciar sesión"}
        </button>
      </div>
    </div>
  )
}
