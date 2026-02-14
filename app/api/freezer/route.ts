import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !url) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    let resolvedUserId: string | null = null
    const authHeader = request.headers.get("authorization")
    console.log("[api/freezer] Incoming request")

    if (authHeader?.startsWith("Bearer ")) {
      console.log("[api/freezer] Bearer header recibido")
      const token = authHeader.slice(7)
      const supabaseAuthToken = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
      const {
        data: { user: tokenUser },
        error: tokenError,
      } = await supabaseAuthToken.auth.getUser(token)

      if (tokenError) {
        console.warn("[api/freezer] auth.getUser con token falló", tokenError)
      } else if (tokenUser) {
        console.log("[api/freezer] Token resolvió usuario:", tokenUser.id)
        resolvedUserId = tokenUser.id
      }
    }

    if (!resolvedUserId) {
      console.log("[api/freezer] Intentando resolver usuario por cookies")
      const cookieStore = await cookies()
      const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })

      const {
        data: { user },
        error: userError,
      } = await supabaseAuth.auth.getUser()

      if (userError || !user) {
        console.warn("[api/freezer] No autenticado por cookies", userError)
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
      }

      console.log("[api/freezer] Cookies resolvieron usuario:", user.id)
      resolvedUserId = user.id
    }

    const supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    console.log("[api/freezer] Consultando congeladores para usuario:", resolvedUserId)
    const { data, error } = await supabaseAdmin
      .from("congeladores")
      .select(
        `
          id,
          nombre,
          descripcion,
          cajones_congelador (
            id,
            nombre,
            posicion,
            descripcion,
            creado_en,
            elementos_cajon (
              id,
              cajon_id,
              nombre,
              cantidad,
              unidad,
              estado,
              categoria,
              fecha_compra,
              fecha_congelacion,
              fecha_caducidad,
              notas,
              reservado,
              imagen_url,
              creado_en
            )
          )
        `,
      )
      .eq("usuario_id", resolvedUserId)
      .order("posicion", { ascending: true, foreignTable: "cajones_congelador" })
      .order("creado_en", { ascending: true, foreignTable: "cajones_congelador.elementos_cajon" })
      .maybeSingle()

    console.log("[api/freezer] Resultado data:", JSON.stringify(data, null, 2))
    console.log("[api/freezer] Resultado error:", error)
    if (error && error.code !== "PGRST116") {
      console.error("[api/freezer] Error fetching freezer:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let freezerData = data

    if (!freezerData) {
      const { data: created, error: createError } = await supabaseAdmin
        .from("congeladores")
        .insert({ usuario_id: resolvedUserId })
        .select("id, nombre, descripcion")
        .single()

      if (createError) {
        console.error("[api/freezer] Error creating freezer:", createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      freezerData = { ...created, cajones_congelador: [] }
    }

    return NextResponse.json({ freezer: freezerData })
  } catch (error) {
    console.error("[api/freezer] Unexpected error:", error)
    return NextResponse.json({ error: (error as Error).message ?? "Unexpected error" }, { status: 500 })
  }
}
