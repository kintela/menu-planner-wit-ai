import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export const FREEZER_ITEM_SELECT_FIELDS = `
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
  creado_en,
  actualizado_en
`

export const FREEZER_SELECT_FIELDS = `
  id,
  usuario_id,
  nombre,
  descripcion,
  cajones_congelador (
    id,
    nombre,
    posicion,
    descripcion,
    creado_en,
    elementos_cajon (
      ${FREEZER_ITEM_SELECT_FIELDS}
    )
  )
`

export type FreezerAccessRole = "owner" | "editor" | "viewer"

type FreezerAdminClient = SupabaseClient<any, "public", any>

type AccessibleFreezerResult = {
  freezer: any
  accessRole: FreezerAccessRole
}

const SHARE_TABLE = "congeladores_usuarios"
const MISSING_RELATION_MARKERS = ["does not exist", "schema cache", "could not find", "relation"]

const isMissingShareTableError = (error: PostgrestError | null) => {
  if (!error) return false
  const haystack = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase()
  return haystack.includes(SHARE_TABLE) && MISSING_RELATION_MARKERS.some((marker) => haystack.includes(marker))
}

const sortItems = (items: any[] | null | undefined) =>
  Array.isArray(items)
    ? [...items].sort((left, right) => {
        const leftDate = left?.creado_en ? new Date(left.creado_en).getTime() : 0
        const rightDate = right?.creado_en ? new Date(right.creado_en).getTime() : 0
        return leftDate - rightDate
      })
    : []

const normalizeFreezer = (rawFreezer: any) => {
  const drawers = Array.isArray(rawFreezer?.cajones_congelador)
    ? [...rawFreezer.cajones_congelador]
        .map((drawer) => ({
          ...drawer,
          elementos_cajon: sortItems(drawer?.elementos_cajon),
        }))
        .sort((left, right) => {
          const leftPosition = typeof left?.posicion === "number" ? left.posicion : Number.MAX_SAFE_INTEGER
          const rightPosition = typeof right?.posicion === "number" ? right.posicion : Number.MAX_SAFE_INTEGER
          return leftPosition - rightPosition
        })
    : []

  return {
    ...rawFreezer,
    cajones_congelador: drawers,
  }
}

const normalizeMembershipRole = (role: string | null | undefined, freezerOwnerId: string | null | undefined, userId: string) => {
  if (role === "owner" || freezerOwnerId === userId) {
    return "owner"
  }
  if (role === "viewer") {
    return "viewer"
  }
  return "editor"
}

const getLegacyOwnedFreezerForUser = async (
  supabase: FreezerAdminClient,
  userId: string,
): Promise<AccessibleFreezerResult | null> => {
  const { data, error } = await supabase
    .from("congeladores")
    .select(FREEZER_SELECT_FIELDS)
    .eq("usuario_id", userId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    freezer: normalizeFreezer(data),
    accessRole: "owner",
  }
}

export function createFreezerAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !url) {
    throw new Error("Supabase configuration missing")
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function resolveAuthenticatedFreezerUserId(request: Request) {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization")
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null

  if (accessToken) {
    const authClient = createFreezerAdminClient()
    const {
      data: { user },
      error,
    } = await authClient.auth.getUser(accessToken)

    if (!error && user) {
      return user.id
    }
  }

  const cookieStore = await cookies()
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore })
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser()

  if (error || !user) {
    return null
  }

  return user.id
}

export async function getAccessibleFreezerForUser(
  supabase: FreezerAdminClient,
  userId: string,
): Promise<AccessibleFreezerResult | null> {
  const { data, error } = await supabase
    .from(SHARE_TABLE)
    .select(
      `
        rol,
        creado_en,
        congeladores!inner (
          ${FREEZER_SELECT_FIELDS}
        )
      `,
    )
    .eq("usuario_id", userId)

  if (error) {
    if (isMissingShareTableError(error)) {
      return getLegacyOwnedFreezerForUser(supabase, userId)
    }
    throw error
  }

  const memberships = (Array.isArray(data) ? data : [])
    .map((entry) => {
      const freezer = Array.isArray(entry?.congeladores) ? entry.congeladores[0] : entry?.congeladores
      if (!freezer) return null
      return {
        freezer: normalizeFreezer(freezer),
        accessRole: normalizeMembershipRole(entry?.rol, freezer?.usuario_id, userId),
        createdAt: entry?.creado_en ? new Date(entry.creado_en).getTime() : Number.MAX_SAFE_INTEGER,
      }
    })
    .filter((entry): entry is { freezer: any; accessRole: FreezerAccessRole; createdAt: number } => Boolean(entry))

  const ownedMembership = memberships.find((entry) => entry.accessRole === "owner")
  if (ownedMembership) {
    return {
      freezer: ownedMembership.freezer,
      accessRole: "owner",
    }
  }

  const legacyOwnedFreezer = await getLegacyOwnedFreezerForUser(supabase, userId)
  if (legacyOwnedFreezer) {
    return legacyOwnedFreezer
  }

  if (memberships.length === 0) {
    return null
  }

  memberships.sort((left, right) => left.createdAt - right.createdAt)
  return {
    freezer: memberships[0].freezer,
    accessRole: memberships[0].accessRole,
  }
}

export async function ensureFreezerOwnerMembership(
  supabase: FreezerAdminClient,
  freezerId: string,
  userId: string,
) {
  const { error } = await supabase.from(SHARE_TABLE).upsert(
    {
      congelador_id: freezerId,
      usuario_id: userId,
      rol: "owner",
    },
    {
      onConflict: "congelador_id,usuario_id",
    },
  )

  if (error && !isMissingShareTableError(error)) {
    throw error
  }
}

export async function resolveFreezerAccess(
  supabase: FreezerAdminClient,
  freezerId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from(SHARE_TABLE)
    .select("rol")
    .eq("congelador_id", freezerId)
    .eq("usuario_id", userId)
    .maybeSingle()

  if (error && !isMissingShareTableError(error)) {
    throw error
  }

  if (data) {
    return {
      hasAccess: true,
      accessRole: normalizeMembershipRole(data.rol, null, userId),
    }
  }

  const { data: freezer, error: freezerError } = await supabase
    .from("congeladores")
    .select("id, usuario_id")
    .eq("id", freezerId)
    .maybeSingle()

  if (freezerError) {
    throw freezerError
  }

  if (freezer?.usuario_id === userId) {
    return {
      hasAccess: true,
      accessRole: "owner" as const,
    }
  }

  return {
    hasAccess: false,
    accessRole: null,
  }
}
