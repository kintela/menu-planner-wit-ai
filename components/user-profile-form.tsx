"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { AlertCircle, Loader2, Trash2, Upload } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { mapAvatarUploadResult } from "@/lib/profile/avatar-presentation"
import type { UserProfile } from "@/lib/types"

type Outcome = { kind: "success" | "error" | "info" | "warning"; text: string } | null

const ALLOWED_AVATAR_TYPES = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"])
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

function outcomeClass(kind: NonNullable<Outcome>["kind"]) {
  if (kind === "success") return "bg-green-100 text-green-700"
  if (kind === "error") return "bg-red-100 text-red-700"
  if (kind === "warning") return "bg-amber-100 text-amber-800"
  return "bg-blue-100 text-blue-700"
}

function Status({ label, outcome }: { label: string; outcome: Outcome }) {
  if (!outcome) return null
  return (
    <div role="status" className={`rounded p-2 text-sm ${outcomeClass(outcome.kind)}`}>
      <strong>{label}:</strong> {outcome.text}
    </div>
  )
}

export function UserProfileForm() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [profileOutcome, setProfileOutcome] = useState<Outcome>(null)
  const [emailOutcome, setEmailOutcome] = useState<Outcome>(null)
  const [avatarOutcome, setAvatarOutcome] = useState<Outcome>(null)
  const [emailError, setEmailError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const [formData, setFormData] = useState({ first_name: "", last_name: "", alias: "", phone: "", email: "" })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const applyProfile = (next: UserProfile) => {
    setProfile(next)
    setFormData({
      first_name: next.first_name ?? "",
      last_name: next.last_name ?? "",
      alias: next.alias ?? "",
      phone: next.phone ?? "",
      email: next.email ?? "",
    })
  }

  const loadProfile = async () => {
    setLoading(true)
    setLoadError("")
    try {
      const response = await fetch("/api/profile", { credentials: "include", cache: "no-store" })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.profile) throw new Error("profile unavailable")
      applyProfile(payload.profile as UserProfile)
    } catch {
      setProfile(null)
      setLoadError("No se pudo cargar el perfil")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const notifyProfileChanged = () => window.dispatchEvent(new Event("profile_updated"))

  const clearAvatarSelection = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setAvatarPreview(null)
    setAvatarFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const validatePhone = (phone: string) => !phone || /^[67]\d{8}$/.test(phone.trim())

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }))
    if (field === "email") setEmailError(value && !validateEmail(value) ? "El formato del email no es válido" : "")
    if (field === "phone") setPhoneError(value && !validatePhone(value) ? "Debe comenzar por 6 o 7 y tener 9 dígitos" : "")
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
      setAvatarOutcome({ kind: "error", text: "La imagen debe ocupar como máximo 5 MB." })
      event.target.value = ""
      return
    }
    if (!ALLOWED_AVATAR_TYPES.has(file.type.toLowerCase())) {
      setAvatarOutcome({ kind: "error", text: "Selecciona una imagen AVIF, GIF, JPEG, PNG o WebP." })
      event.target.value = ""
      return
    }
    clearAvatarSelection()
    const preview = URL.createObjectURL(file)
    previewUrlRef.current = preview
    setAvatarFile(file)
    setAvatarPreview(preview)
    setAvatarOutcome({ kind: "info", text: "Imagen preparada. Guarda los cambios para subirla." })
  }

  const uploadSelectedAvatar = async () => {
    if (!avatarFile) return true
    setUploading(true)
    setAvatarOutcome({ kind: "info", text: "Subiendo imagen..." })
    try {
      const body = new FormData()
      body.set("avatar", avatarFile)
      const response = await fetch("/api/profile/avatar", { method: "POST", credentials: "include", body })
      const payload = await response.json().catch(() => null)
      const result = payload?.avatar
      const presentation = mapAvatarUploadResult(result, response.ok)
      setAvatarOutcome(presentation.outcome)
      if (!presentation.succeeded) return false
      clearAvatarSelection()
      await loadProfile()
      notifyProfileChanged()
      return true
    } catch {
      setAvatarOutcome({ kind: "error", text: "No se pudo actualizar el avatar; se conserva el anterior." })
      return false
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    setRemoving(true)
    setAvatarOutcome({ kind: "info", text: "Restableciendo el avatar predeterminado..." })
    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE", credentials: "include" })
      const payload = await response.json().catch(() => null)
      const result = payload?.avatar
      if (result?.state === "complete" && response.ok) {
        setAvatarOutcome({ kind: "success", text: "Avatar eliminado. Se muestra el avatar predeterminado." })
        clearAvatarSelection()
        await loadProfile()
        notifyProfileChanged()
      } else if (result?.state === "partial") {
        setAvatarOutcome({ kind: "warning", text: "El archivo se eliminó, pero no se pudo limpiar por completo la referencia del perfil." })
      } else {
        setAvatarOutcome({ kind: "error", text: "No se pudo eliminar el avatar. No se ha indicado como restablecido." })
      }
    } catch {
      setAvatarOutcome({ kind: "error", text: "No se pudo eliminar el avatar. No se ha indicado como restablecido." })
    } finally {
      setRemoving(false)
    }
  }

  const changeEmail = async (email: string) => {
    setEmailOutcome({ kind: "info", text: "Solicitando el cambio de correo..." })
    try {
      const response = await fetch("/api/profile/email", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const payload = await response.json().catch(() => null)
      const result = payload?.emailChange
      if (result?.state === "pending") {
        setEmailOutcome({ kind: "info", text: "Cambio pendiente: revisa tu correo y confirma la nueva dirección." })
      } else if (result?.state === "confirmed" && result?.profileSync === "complete") {
        setEmailOutcome({ kind: "success", text: "Correo cambiado y confirmado correctamente." })
        await loadProfile()
      } else if (result?.state === "confirmed") {
        setEmailOutcome({ kind: "warning", text: "El correo se confirmó, pero no pudo sincronizarse por completo con el perfil." })
        await loadProfile()
      } else {
        setEmailOutcome({ kind: "error", text: "El proveedor rechazó el cambio de correo. Los demás datos guardados no se han revertido." })
      }
    } catch {
      setEmailOutcome({ kind: "error", text: "No se pudo solicitar el cambio de correo. Los demás datos guardados no se han revertido." })
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile) return
    if (!validateEmail(formData.email)) {
      setEmailError("El formato del email no es válido")
      return
    }
    if (!validatePhone(formData.phone)) {
      setPhoneError("Debe comenzar por 6 o 7 y tener 9 dígitos")
      return
    }

    setSaving(true)
    setProfileOutcome({ kind: "info", text: "Guardando datos personales..." })
    setEmailOutcome(null)
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          alias: formData.alias,
          phone: formData.phone,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.profile) {
        setProfileOutcome({ kind: "error", text: "No se pudieron guardar los datos personales." })
        return
      }

      setProfileOutcome({ kind: "success", text: "Datos personales guardados correctamente." })
      setProfile((previous) => previous ? { ...previous, ...payload.profile, email: previous.email } : payload.profile)
      notifyProfileChanged()

      const originalEmail = profile.email.trim().toLowerCase()
      const requestedEmail = formData.email.trim().toLowerCase()
      if (requestedEmail !== originalEmail) await changeEmail(requestedEmail)
      await uploadSelectedAvatar()
    } catch {
      setProfileOutcome({ kind: "error", text: "No se pudieron guardar los datos personales." })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !profile) {
    return <Card><CardContent className="flex items-center justify-center p-8"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Cargando perfil...</CardContent></Card>
  }

  if (!profile) {
    return <Card><CardContent className="p-8 text-center"><p className="mb-4 text-red-600">{loadError || "No se pudo cargar el perfil"}</p><Button onClick={() => void loadProfile()}>Reintentar</Button></CardContent></Card>
  }

  const busy = saving || uploading || removing
  const fallback = (formData.first_name || profile.full_name || formData.email || "U").charAt(0).toUpperCase()

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Información Personal</CardTitle>
        <Status label="Perfil" outcome={profileOutcome} />
        <Status label="Correo" outcome={emailOutcome} />
        <Status label="Avatar" outcome={avatarOutcome} />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarPreview || profile.avatar_url || undefined} alt="Avatar" />
              <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <span className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"><Upload className="h-4 w-4" />Cambiar avatar</span>
              </Label>
              <Input ref={fileInputRef} id="avatar-upload" type="file" accept="image/avif,image/gif,image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" disabled={busy} />
              {avatarFile && <Button type="button" variant="outline" onClick={clearAvatarSelection} disabled={busy}>Cancelar selección</Button>}
              <Button type="button" variant="destructive" onClick={() => void removeAvatar()} disabled={busy || (!profile.has_custom_avatar && !avatarFile)}>
                {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Quitar avatar
              </Button>
            </div>
            <p className="text-xs text-gray-500">AVIF, GIF, JPEG, PNG o WebP. Máximo 5 MB.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="first_name">Nombre</Label><Input id="first_name" value={formData.first_name} onChange={(e) => handleInputChange("first_name", e.target.value)} placeholder="Tu nombre" disabled={busy} /></div>
            <div className="space-y-2"><Label htmlFor="last_name">Apellidos</Label><Input id="last_name" value={formData.last_name} onChange={(e) => handleInputChange("last_name", e.target.value)} placeholder="Tus apellidos" disabled={busy} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="alias">Alias</Label><Input id="alias" value={formData.alias} onChange={(e) => handleInputChange("alias", e.target.value)} placeholder="Tu nombre de usuario" disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="phone">Teléfono móvil</Label><Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} placeholder="Tu número de teléfono" disabled={busy} className={phoneError ? "border-red-500" : ""} />{phoneError && <p className="flex items-center text-xs text-red-500"><AlertCircle className="mr-1 h-3 w-3" />{phoneError}</p>}</div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} placeholder="Tu email" disabled={busy} className={emailError ? "border-red-500" : ""} />{emailError && <p className="flex items-center text-xs text-red-500"><AlertCircle className="mr-1 h-3 w-3" />{emailError}</p>}</div>
          <div className="flex justify-end"><Button type="submit" disabled={busy || Boolean(emailError || phoneError)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Guardando..." : "Guardar cambios"}</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}
