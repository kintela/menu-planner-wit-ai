import { cookies } from "next/headers"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@/lib/supabase/server"

import {
  FREEZER_ACCESS_ERRORS,
  FREEZER_ITEM_SELECT_FIELDS,
  FREEZER_SELECT_FIELDS,
  MENSAJE_PAYLOAD_INVALIDO,
  authorizeFreezerRequest,
  ensureFreezerOwnerMembership,
  freezerAccessError,
  freezerBodyExcedeLimite,
  freezerWriteAccessOutcome,
  getAccessibleFreezerForUser,
  handleFreezerDrawersPost,
  handleFreezerDrawerItemsDelete,
  handleFreezerGet,
  handleFreezerItemDelete,
  handleFreezerItemPatch,
  handleFreezerItemPost,
  normalizeMembershipRole,
  requireActiveFreezerProfile,
  resolveFreezerAccess,
  resolveFreezerSessionUserId,
} from "@/lib/freezer/freezer-access-logic"
// La lógica autoritativa vive en `lib/freezer/freezer-access-logic.js` (pura,
// testeable con dobles inyectados). Este archivo es el adaptador de servidor:
// construye los clientes reales (sesión por cookies y service-role) y
// reexporta la capa de acceso para las cinco rutas y sus tests estáticos.
export {
  FREEZER_ACCESS_ERRORS,
  FREEZER_ITEM_SELECT_FIELDS,
  FREEZER_SELECT_FIELDS,
  MENSAJE_PAYLOAD_INVALIDO,
  authorizeFreezerRequest,
  ensureFreezerOwnerMembership,
  freezerAccessError,
  freezerWriteAccessOutcome,
  getAccessibleFreezerForUser,
  handleFreezerDrawersPost,
  handleFreezerDrawerItemsDelete,
  handleFreezerGet,
  handleFreezerItemDelete,
  handleFreezerItemPatch,
  handleFreezerItemPost,
  normalizeMembershipRole,
  requireActiveFreezerProfile,
  resolveFreezerAccess,
  resolveFreezerSessionUserId,
}

export type FreezerAccessRole = "owner" | "editor" | "viewer"

type FreezerAdminClient = SupabaseClient<any, "public", any>

// Cliente de sesión del route handler: la identidad procede exclusivamente de
// las cookies de sesión (@supabase/ssr); nunca de tokens aportados por cliente.
export async function createFreezerSessionClient() {
  const cookieStore = await cookies()
  // @supabase/ssr understands the chunked/base64 cookie format emitted by the
  // browser singleton. The deprecated auth-helpers adapter attempts JSON.parse
  // on that cookie and silently turns every authenticated request into a 401.
  return createServerClient(cookieStore)
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

// Lectura del cuerpo JSON de las rutas de elementos (RF-24, RF-27): límite de
// tamaño en bytes UTF-8 antes de analizar y rechazo uniforme 400 cuando el
// cuerpo es demasiado grande o no es JSON válido.
export async function readFreezerJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; body: null }> {
  const raw = await request.text().catch(() => null)

  if (raw === null || freezerBodyExcedeLimite(raw)) {
    return { ok: false, body: null }
  }

  try {
    return { ok: true, body: JSON.parse(raw) as unknown }
  } catch {
    return { ok: false, body: null }
  }
}

// Identidad solo por cookies del route handler (RF-1): ningún dato del
// cliente (incluido un token de sesión en cabeceras) constituye identidad.
export async function resolveAuthenticatedFreezerUserId(_request?: Request) {
  const supabaseAuth = await createFreezerSessionClient()
  return resolveFreezerSessionUserId(supabaseAuth)
}

// Comprobación reutilizable por las cinco rutas (RF-2): sesión por cookies →
// perfil propio leído con la sesión (RLS owner-only) → rol exacto de la
// allowlist. Devuelve el error uniforme (401 / denegación genérica en español)
// o el usuario autorizado junto a su cliente de sesión.
export async function requireActiveFreezerUser() {
  const sessionClient = await createFreezerSessionClient()
  return authorizeFreezerRequest(sessionClient, createFreezerAdminClient())
}
