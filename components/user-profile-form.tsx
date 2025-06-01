"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { Upload, Save, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  alias?: string
  avatar_url?: string
  role: string
}

export function UserProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    alias: "",
    avatar_url: "",
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

      if (error) {
        console.error("Error loading profile:", error)
        return
      }

      setProfile(profile)
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        alias: profile.alias || "",
        avatar_url: profile.avatar_url || "",
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]
      const fileExt = file.name.split(".").pop()
      const fileName = `${profile?.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

      setFormData((prev) => ({
        ...prev,
        avatar_url: data.publicUrl,
      }))

      toast({
        title: "Imagen subida",
        description: "Tu avatar se ha subido correctamente.",
      })
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Error",
        description: "No se pudo subir la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    try {
      setSaving(true)

      // Construir el full_name a partir de first_name y last_name
      const full_name = `${formData.first_name} ${formData.last_name}`.trim()

      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          alias: formData.alias || null,
          avatar_url: formData.avatar_url || null,
          full_name: full_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) {
        throw error
      }

      toast({
        title: "Perfil actualizado",
        description: "Tus datos se han guardado correctamente.",
      })

      // Recargar el perfil
      await loadProfile()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">No se pudo cargar el perfil.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={formData.avatar_url || "/placeholder.svg"} alt="Avatar" />
              <AvatarFallback className="text-lg">
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>

            <div className="flex items-center space-x-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Subiendo..." : "Cambiar Avatar"}
                  </span>
                </Button>
              </Label>
              <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
          </div>

          {/* Email (solo lectura) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={profile.email} disabled className="bg-gray-50" />
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="first_name">Nombre</Label>
            <Input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={(e) => handleInputChange("first_name", e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          {/* Apellidos */}
          <div className="space-y-2">
            <Label htmlFor="last_name">Apellidos</Label>
            <Input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={(e) => handleInputChange("last_name", e.target.value)}
              placeholder="Tus apellidos"
            />
          </div>

          {/* Alias */}
          <div className="space-y-2">
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              type="text"
              value={formData.alias}
              onChange={(e) => handleInputChange("alias", e.target.value)}
              placeholder="Tu alias o nombre de usuario"
            />
          </div>

          {/* Rol (solo lectura) */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Input
              id="role"
              type="text"
              value={profile.role === "admin" ? "Administrador" : "Usuario"}
              disabled
              className="bg-gray-50"
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
