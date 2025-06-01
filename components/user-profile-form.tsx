"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Save, Loader2 } from "lucide-react"

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

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    alias: "",
    phone: "",
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
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

      setProfile(profileData)
      setFormData({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        alias: profileData.alias || "",
        phone: profileData.phone || "",
      })

      setMessage("")
    } catch (error) {
      console.error("Error:", error)
      setMessage("Error inesperado al cargar el perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
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

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      setMessage("Subiendo imagen...")

      const fileExt = file.name.split(".").pop()
      const fileName = `${profile?.id}/avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })

      if (uploadError) {
        console.error("Error uploading avatar:", uploadError)
        setMessage("Error al subir la imagen")
        return null
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
      return data.publicUrl
    } catch (error) {
      console.error("Error uploading avatar:", error)
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

    try {
      setSaving(true)
      setMessage("Guardando cambios...")

      let avatarUrl = profile.avatar_url

      // Subir avatar si se seleccionó uno nuevo
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile)
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        } else {
          return // Error en la subida
        }
      }

      // Construir el nombre completo
      const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(" ") || null

      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          alias: formData.alias || null,
          phone: formData.phone || null,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Error updating profile:", error)
        setMessage("Error al actualizar el perfil")
        return
      }

      // Recargar el perfil
      await loadProfile()

      // Limpiar estado del formulario
      setAvatarFile(null)
      setAvatarPreview(null)

      setMessage("✅ Perfil actualizado correctamente")

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      console.error("Error:", error)
      setMessage("Error inesperado al actualizar el perfil")
    } finally {
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
            className={`text-sm p-2 rounded ${
              message.includes("✅")
                ? "bg-green-100 text-green-700"
                : message.includes("Error")
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
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
                  profile.email.charAt(0).toUpperCase()}
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
                disabled={uploading}
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder="Tus apellidos"
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
            />
          </div>

          {/* Información de Solo Lectura */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile.email} disabled className="bg-gray-50" />
          </div>

          {/* Botón de Envío */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || uploading} className="flex items-center space-x-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
