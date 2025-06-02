"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { Upload, Loader2, AlertCircle } from "lucide-react"


interface UserProfile {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  alias: string | null
  avatar_url: string | null
  role: string
  phone: string | null
}

export function UserProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [emailError, setEmailError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    alias: "",
    phone: "",
    email: "",
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadProfile()

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const loadProfile = async () => {
    try {
      console.log("Loading profile...")

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("Error getting user:", userError)
        setMessage("Error: No se pudo obtener el usuario")
        return
      }

      console.log("User found:", user.email)

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.error("Error loading profile:", profileError)
        setMessage("Error al cargar el perfil")
        return
      }

      console.log("Profile loaded:", profileData)

      // Usar el email que está guardado en la tabla user_profiles
      const emailToUse = profileData.email || user.email || ""

      setProfile({
        ...profileData,
        email: emailToUse,
      })

      setFormData({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        alias: profileData.alias || "",
        phone: profileData.phone || "",
        email: emailToUse,
      })

      setMessage("")
    } catch (error) {
      console.error("Error:", error)
      setMessage("Error inesperado al cargar el perfil")
    } finally {
      setLoading(false)
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email.trim())
  }

  const validatePhone = (phone: string): boolean => {
    // Si el campo está vacío, lo consideramos válido (no es obligatorio)
    if (!phone) return true

    const phoneRegex = /^[67]\d{8}$/
    return phoneRegex.test(phone.trim())
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Validación en tiempo real
    if (field === "email") {
      if (value && !validateEmail(value)) {
        setEmailError("El formato del email no es válido")
      } else {
        setEmailError("")
      }
    }

    if (field === "phone") {
      if (value && !validatePhone(value)) {
        setPhoneError("Debe comenzar por 6 o 7 y tener 9 dígitos")
      } else {
        setPhoneError("")
      }
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Verificar tamaño del archivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage("La imagen es demasiado grande. Máximo 5MB.")
        return
      }

      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Función simplificada para extraer el path del archivo de la URL
  const extractFilePathFromUrl = (url: string): string | null => {
    try {
      // Buscar el patrón después de '/avatars/'
      const match = url.match(/\/avatars\/(.+)$/)
      if (match && match[1]) {
        console.log("Extracted file path:", match[1])
        return match[1]
      }
      return null
    } catch (error) {
      console.error("Error extracting file path:", error)
      return null
    }
  }

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      setMessage("Subiendo imagen...")

      if (!profile?.id) {
        console.error("No profile ID available")
        setMessage("Error: No se pudo identificar el perfil")
        return null
      }

      // Guardar la URL del avatar anterior para eliminarlo después
      const oldAvatarUrl = profile.avatar_url

      // Subir la nueva imagen
      const fileExt = file.name.split(".").pop()
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`

      console.log("🔄 Uploading new avatar:", filePath)

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error("❌ Error uploading avatar:", uploadError)
        setMessage("Error al subir la imagen")
        return null
      }

      // Obtener la URL pública de la nueva imagen
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
      console.log("✅ New avatar uploaded successfully:", data.publicUrl)

      // Intentar eliminar el avatar anterior si existe
      if (oldAvatarUrl) {
        console.log("🗑️ Attempting to delete old avatar:", oldAvatarUrl)
        const oldFilePath = extractFilePathFromUrl(oldAvatarUrl)

        if (oldFilePath) {
          console.log("🗑️ Deleting file path:", oldFilePath)
          const { error: deleteError } = await supabase.storage.from("avatars").remove([oldFilePath])

          if (deleteError) {
            console.error("❌ Error deleting old avatar:", deleteError)
            console.error("Delete error details:", JSON.stringify(deleteError, null, 2))
          } else {
            console.log("✅ Old avatar deleted successfully")
          }
        } else {
          console.warn("⚠️ Could not extract file path from old avatar URL")
        }
      }

      return data.publicUrl
    } catch (error) {
      console.error("❌ Error in uploadAvatar:", error)
      setMessage("Error al subir la imagen")
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile) {
      setMessage("No se pudo cargar el perfil")
      return
    }

    // Validar formato de email
    if (!formData.email || !validateEmail(formData.email)) {
      setMessage(
        "Error: El formato del email no es válido. Por favor, introduce un email con formato correcto (ejemplo@dominio.com)",
      )
      return
    }

    // Validar formato de teléfono móvil
    if (formData.phone && !validatePhone(formData.phone)) {
      setMessage(
        "Error: El formato del teléfono móvil no es válido. Debe comenzar por 6 o 7 y tener 9 dígitos en total.",
      )
      return
    }


    console.log("🚀 Starting form submission...")
    setSaving(true)
    setMessage("Guardando cambios...")

    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      console.log("⏰ Timeout reached, stopping process")
      setSaving(false)
      setMessage("Error: La operación ha tardado demasiado tiempo.")
    }, 15000) // 15 segundos

    try {
      const originalEmail = profile.email
      const emailHasChanged = formData.email.trim().toLowerCase() !== originalEmail.trim().toLowerCase()

      console.log("📧 Email comparison:")
      console.log("📧 Original email (trimmed/lowercase):", originalEmail.trim().toLowerCase())
      console.log("📧 New email (trimmed/lowercase):", formData.email.trim().toLowerCase())
      console.log("📧 Email has changed:", emailHasChanged)


      let avatarUrl = profile.avatar_url

      // Subir avatar si se seleccionó uno nuevo
      if (avatarFile) {

        console.log("📷 Uploading avatar...")
        const uploadedUrl = await uploadAvatar(avatarFile)
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
          console.log("✅ Avatar uploaded successfully")
        } else {
          console.log("❌ Avatar upload failed")
          clearTimeout(timeoutId)

          setSaving(false)
          return
        }
      }

      // Construir el nombre completo
      const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(" ") || null

      if (emailHasChanged) {
        console.log("📧 Email is different - processing email change...")

        // Primero actualizamos todos los demás campos del perfil
        console.log("📝 Updating profile fields first...")
        const { error: profileError } = await supabase
          .from("user_profiles")
          .update({
            first_name: formData.first_name || null,
            last_name: formData.last_name || null,
            alias: formData.alias || null,
            phone: formData.phone || null,
            // Mantenemos el email original por ahora
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)

        if (profileError) {
          console.error("❌ Error updating profile:", profileError)
          setMessage("Error al actualizar el perfil en la base de datos")
          clearTimeout(timeoutId)
          setSaving(false)
          return
        }

        console.log("✅ Profile fields updated successfully")

        // Ahora intentamos actualizar el email
        setMessage("Intentando actualizar email...")
        console.log("📧 Attempting to update auth.users...")

        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email,
        })

        if (authError) {
          console.error("❌ Error updating auth.users:", authError)

          // Manejar específicamente el error de límite de velocidad
          if (authError.message.includes("email rate limit exceeded")) {
            setMessage(
              "✅ Perfil actualizado correctamente. ⚠️ El cambio de email no se pudo procesar debido al límite de velocidad de Supabase. Por favor, espera unos minutos e intenta cambiar solo el email más tarde.",
            )

            // Revertir el email en el formulario al original
            setFormData((prev) => ({ ...prev, email: originalEmail }))

            // Actualizar estado local sin el nuevo email
            setProfile((prev) => ({
              ...prev!,
              first_name: formData.first_name || null,
              last_name: formData.last_name || null,
              alias: formData.alias || null,
              phone: formData.phone || null,
              // Mantener el email original
              email: originalEmail,
              full_name: fullName,
              avatar_url: avatarUrl,
            }))
          } else if (authError.message.includes("email address already in use")) {
            setMessage(
              "✅ Perfil actualizado correctamente. ⚠️ Esta dirección de email ya está siendo utilizada por otra cuenta.",
            )
            setFormData((prev) => ({ ...prev, email: originalEmail }))
          } else {
            setMessage(`✅ Perfil actualizado correctamente. ⚠️ Error al actualizar el email: ${authError.message}`)
            setFormData((prev) => ({ ...prev, email: originalEmail }))
          }
        } else {
          console.log("✅ Auth.users updated successfully")

          // Si el email se actualizó correctamente, actualizamos también user_profiles
          const { error: emailUpdateError } = await supabase
            .from("user_profiles")
            .update({
              email: formData.email,
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id)

          if (emailUpdateError) {
            console.error("❌ Error updating email in user_profiles:", emailUpdateError)
            setMessage("✅ Perfil actualizado. ⚠️ Error al sincronizar el email en la base de datos.")
          } else {
            console.log("✅ Email updated in user_profiles successfully")
            setMessage(
              "📧 Perfil actualizado correctamente. Se ha enviado un email de confirmación a la nueva dirección. Por favor, verifica tu bandeja de entrada para confirmar el cambio de email.",
            )

            // Actualizar estado local con el nuevo email
            setProfile((prev) => ({
              ...prev!,
              first_name: formData.first_name || null,
              last_name: formData.last_name || null,
              alias: formData.alias || null,
              phone: formData.phone || null,
              email: formData.email,
              full_name: fullName,
              avatar_url: avatarUrl,
            }))
          }
        }
      } else {
        console.log("📧 Email is the same - skipping email update...")
        console.log("📝 Processing normal profile update...")

        const { error: profileError } = await supabase
          .from("user_profiles")
          .update({
            first_name: formData.first_name || null,
            last_name: formData.last_name || null,
            alias: formData.alias || null,
            phone: formData.phone || null,
            email: formData.email,
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)

        if (profileError) {
          console.error("❌ Error updating profile:", profileError)
          setMessage("Error al actualizar el perfil en la base de datos")
          clearTimeout(timeoutId)
          setSaving(false)
          return
        }

        console.log("✅ Profile updated successfully")
        setMessage("✅ Perfil actualizado correctamente")
      }

      // Actualizar estado local
      console.log("🔄 Updating local state...")

      setProfile((prev) => ({
        ...prev!,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        alias: formData.alias || null,
        phone: formData.phone || null,
        email: formData.email,
        full_name: fullName,
        avatar_url: avatarUrl,
      }))


      const event = new CustomEvent("avatar_updated", {
        detail: {
          avatarUrl: avatarUrl,
          fullName: fullName,
          timestamp: Date.now(),
        },
      })
      window.dispatchEvent(event)


      // Limpiar estado del formulario de avatar
      setAvatarFile(null)
      setAvatarPreview(null)

      // Limpiar mensaje después de un tiempo
      setTimeout(() => setMessage(""), emailHasChanged ? 10000 : 3000)

      console.log("✅ Form submission completed successfully")
    } catch (error) {
      console.error("❌ Unexpected error in handleSubmit:", error)
      setMessage("Error inesperado al actualizar el perfil")
    } finally {
      console.log("🏁 Cleaning up form submission...")
      clearTimeout(timeoutId)

      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Cargando perfil...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{message || "No se pudo cargar el perfil"}</p>
            <Button onClick={loadProfile}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Personal</CardTitle>
        {message && (
          <div
            className={`text-sm p-2 rounded flex items-center ${
              message.includes("✅")
                ? "bg-green-100 text-green-700"
                : message.includes("Error")
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            {message.includes("Error") && <AlertCircle className="h-4 w-4 mr-1" />}
            {message}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarPreview || profile.avatar_url || undefined} alt="Avatar" />
              <AvatarFallback className="text-lg">
                {formData.first_name?.charAt(0) ||
                  profile.full_name?.charAt(0) ||
                  formData.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex items-center space-x-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>{uploading ? "Subiendo..." : "Cambiar Avatar"}</span>
                </div>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={uploading || saving}
              />
            </div>
          </div>

          {/* Información Personal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                placeholder="Tu nombre"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder="Tus apellidos"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              value={formData.alias}
              onChange={(e) => handleInputChange("alias", e.target.value)}
              placeholder="Tu nombre de usuario"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono móvil</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="Tu número de teléfono"
              type="tel"
              disabled={saving}
              className={phoneError ? "border-red-500" : ""}
            />
            {phoneError && (
              <p className="text-xs text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {phoneError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Tu email"
              type="email"
              required
              disabled={saving}
              className={emailError ? "border-red-500" : ""}
            />
            {emailError && (
              <p className="text-xs text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {emailError}
              </p>
            )}
          </div>

          {/* Botón de Envío */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving || uploading || emailError !== "" || phoneError !== ""}
              className="flex items-center space-x-2"
            >

              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}

              <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
