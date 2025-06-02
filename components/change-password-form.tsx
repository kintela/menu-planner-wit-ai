"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react"

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const supabase = createClient()

  const validatePassword = (password: string): string => {
    if (password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres"
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "La contraseña debe contener al menos una letra minúscula"
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "La contraseña debe contener al menos una letra mayúscula"
    }
    if (!/(?=.*\d)/.test(password)) {
      return "La contraseña debe contener al menos un número"
    }
    return ""
  }

  const validateCurrentPassword = async (password: string) => {
    if (!password) return

    setLoading(true)
    try {
      // Obtenemos el email del usuario actual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user?.email) {
        setErrors((prev) => ({ ...prev, currentPassword: "No se pudo verificar el usuario" }))
        return false
      }

      // Intentamos iniciar sesión con la contraseña proporcionada
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      })

      if (signInError) {
        setErrors((prev) => ({ ...prev, currentPassword: "La contraseña actual es incorrecta" }))
        return false
      }

      // Si no hay error, la contraseña es correcta
      return true
    } catch (error) {
      console.error("Error validating current password:", error)
      setErrors((prev) => ({ ...prev, currentPassword: "Error al validar la contraseña" }))
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case "currentPassword":
        setCurrentPassword(value)
        setErrors((prev) => ({ ...prev, currentPassword: "" }))
        // Si el campo tiene contenido y pierde el foco, validamos la contraseña
        if (value) {
          validateCurrentPassword(value)
        }
        break
      case "newPassword":
        setNewPassword(value)
        const passwordError = validatePassword(value)
        setErrors((prev) => ({ ...prev, newPassword: passwordError }))
        // También validar confirmación si ya tiene valor
        if (confirmPassword && value !== confirmPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: "Las contraseñas no coinciden" }))
        } else if (confirmPassword && value === confirmPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: "" }))
        }
        break
      case "confirmPassword":
        setConfirmPassword(value)
        if (value !== newPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: "Las contraseñas no coinciden" }))
        } else {
          setErrors((prev) => ({ ...prev, confirmPassword: "" }))
        }
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Limpiar mensaje anterior
    setMessage("")

    // Validaciones
    if (!currentPassword) {
      setErrors((prev) => ({ ...prev, currentPassword: "La contraseña actual es requerida" }))
      return
    }

    if (!newPassword) {
      setErrors((prev) => ({ ...prev, newPassword: "La nueva contraseña es requerida" }))
      return
    }

    const passwordValidation = validatePassword(newPassword)
    if (passwordValidation) {
      setErrors((prev) => ({ ...prev, newPassword: passwordValidation }))
      return
    }

    if (newPassword !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Las contraseñas no coinciden" }))
      return
    }

    if (currentPassword === newPassword) {
      setMessage("La nueva contraseña debe ser diferente a la actual")
      return
    }

    setLoading(true)

    try {
      // Validar la contraseña actual primero
      const isCurrentPasswordValid = await validateCurrentPassword(currentPassword)

      if (!isCurrentPasswordValid) {
        // El error ya se estableció en validateCurrentPassword
        return
      }

      // Si llegamos aquí, la contraseña actual es correcta
      // Ahora actualizamos la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        console.error("Error updating password:", updateError)
        setMessage(`Error al actualizar la contraseña: ${updateError.message}`)
        return
      }

      // Éxito
      setMessage("✅ Contraseña actualizada correctamente")

      // Limpiar formulario
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setErrors({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setMessage(""), 5000)
    } catch (error) {
      console.error("Unexpected error:", error)
      setMessage("Error inesperado al cambiar la contraseña")
    } finally {
      setLoading(false)
    }
  }

  const hasErrors = Object.values(errors).some((error) => error !== "")
  const isFormValid = currentPassword && newPassword && confirmPassword && !hasErrors

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar Contraseña</CardTitle>
        {message && (
          <div
            className={`text-sm p-3 rounded flex items-center ${
              message.includes("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {message.includes("✅") ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-2" />
            )}
            {message}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña Actual */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña Actual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                onBlur={() => currentPassword && validateCurrentPassword(currentPassword)}
                placeholder="Introduce tu contraseña actual"
                disabled={loading}
                className={errors.currentPassword ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={loading}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.currentPassword}
              </p>
            )}
          </div>

          {/* Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => handleInputChange("newPassword", e.target.value)}
                placeholder="Introduce tu nueva contraseña"
                disabled={loading}
                className={errors.newPassword ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.newPassword}
              </p>
            )}
            <div className="text-xs text-gray-500">
              La contraseña debe tener al menos 6 caracteres, incluyendo mayúsculas, minúsculas y números.
            </div>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                disabled={loading}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Botón de Envío */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading || !isFormValid} className="flex items-center space-x-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? "Cambiando..." : "Cambiar Contraseña"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
