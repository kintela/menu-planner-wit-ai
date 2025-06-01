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
import { useRouter } from "next/navigation"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  alias: string | null
  avatar_url: string | null
  role: string
}

export function UserProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    alias: "",
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data: profileData, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

      if (error) {
        console.error("Error loading profile:", error)
        return
      }

      setProfile(profileData)
      setFormData({
        first_name: profileData.first_name || "",
        last_name: profileData.last_name || "",
        alias: profileData.alias || "",
      })
    } catch (error) {
      console.error("Error:", error)
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

      const fileExt = file.name.split(".").pop()
      const fileName = `${profile?.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true })

      if (uploadError) {
        console.error("Error uploading avatar:", uploadError)
        return null
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)

      return data.publicUrl
    } catch (error) {
      console.error("Error uploading avatar:", error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile) return

    try {
      setSaving(true)

      let avatarUrl = profile.avatar_url

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile)
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        }
      }

      // Update the full_name field based on first_name and last_name
      const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(" ") || null

      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          alias: formData.alias || null,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Error updating profile:", error)
        alert("Error al actualizar el perfil")
        return
      }

      // Reload profile data
      await loadProfile()

      // Clear form state
      setAvatarFile(null)
      setAvatarPreview(null)

      alert("Perfil actualizado correctamente")
    } catch (error) {
      console.error("Error:", error)
      alert("Error al actualizar el perfil")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p>No se pudo cargar el perfil del usuario</p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Personal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarPreview || profile.avatar_url || undefined} alt="Avatar" />
              <AvatarFallback className="text-lg">
                {profile.first_name?.charAt(0) || profile.full_name?.charAt(0) || profile.email.charAt(0)}
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

          {/* Personal Information */}
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
            <Label htmlFor="alias">Alias (opcional)</Label>
            <Input
              id="alias"
              value={formData.alias}
              onChange={(e) => handleInputChange("alias", e.target.value)}
              placeholder="Tu nombre de usuario"
            />
          </div>

          {/* Read-only Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile.email} disabled className="bg-gray-50" />
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Input value={profile.role === "admin" ? "Administrador" : "Usuario"} disabled className="bg-gray-50" />
            </div>
          </div>

          {/* Submit Button */}
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
