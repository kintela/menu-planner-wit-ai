import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth"

export async function POST() {
  try {
    const supabase = createServerClient()

    // Verificar que el usuario actual es admin
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Obtener todos los usuarios de auth.users que no tienen perfil
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error("Error obteniendo usuarios de auth:", authError)
      return NextResponse.json({ error: "Error obteniendo usuarios" }, { status: 500 })
    }

    // Obtener perfiles existentes
    const { data: existingProfiles, error: profilesError } = await supabase.from("user_profiles").select("id")

    if (profilesError) {
      console.error("Error obteniendo perfiles:", profilesError)
      return NextResponse.json({ error: "Error obteniendo perfiles" }, { status: 500 })
    }

    const existingProfileIds = new Set(existingProfiles?.map((p) => p.id) || [])
    const missingProfiles = authUsers.users.filter((user) => !existingProfileIds.has(user.id))

    console.log(`Encontrados ${missingProfiles.length} usuarios sin perfil`)

    // Crear perfiles faltantes
    const createdProfiles = []
    for (const user of missingProfiles) {
      const isAdminEmail = user.email === "roberto.quintela@protonmail.com"
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || ""
      const firstName = user.user_metadata?.first_name || fullName.split(" ")[0] || ""

      const { data: newProfile, error: createError } = await supabase
        .from("user_profiles")
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          first_name: firstName,
          role: isAdminEmail ? "admin" : "user_full",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        console.error(`Error creando perfil para ${user.email}:`, createError)
      } else {
        createdProfiles.push(newProfile)
        console.log(`Perfil creado para ${user.email}`)
      }
    }

    return NextResponse.json({
      message: `Se crearon ${createdProfiles.length} perfiles de ${missingProfiles.length} usuarios faltantes`,
      created: createdProfiles.length,
      missing: missingProfiles.length,
      profiles: createdProfiles,
    })
  } catch (error) {
    console.error("Error en fix-missing-profiles:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
