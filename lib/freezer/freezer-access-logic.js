// Capa de acceso a congeladores: lógica autoritativa (Spec 005, T3) y
// manejadores puros de rutas (T4–T7). Sin red, sin SDK de Supabase y sin Next:
// los clientes (sesión por cookies o service-role) se inyectan;
// `lib/freezer-access.ts` los construye en servidor.
// Exclusivamente servidor: nunca en cliente ni en respuestas o logs.

const { buildCajonesNuevos, decidirCajones, formatFechaMostrada, parseCantidad, parseEstado } = require("./freezer-domain")

const SHARE_TABLE = "congeladores_usuarios"
const MISSING_RELATION_MARKERS = ["does not exist", "schema cache", "could not find", "relation"]

// Allowlist cerrada de roles de compartición (RF-23, RF-25): cualquier otro
// valor deniega en lugar de degradar a editor.
const SHARE_ROLES = Object.freeze(["owner", "editor", "viewer"])

// Perfil vigente (RF-2): rol exacto; sin perfil, rol nulo o distinto deniega.
const ACTIVE_PROFILE_ROLES = Object.freeze(["admin"])

// Política uniforme de errores (RF-24, RF-27): mensajes genéricos en español,
// sin mensajes de PostgREST/SQL, sin secretos ni detalles internos. La
// denegación por perfil no detalla el estado del perfil.
const FREEZER_ACCESS_ERRORS = Object.freeze({
  unauthenticated: Object.freeze({ status: 401, message: "Debes iniciar sesión." }),
  profileDenied: Object.freeze({
    status: 403,
    message: "No tienes permiso para gestionar el inventario de congeladores.",
  }),
  notFound: Object.freeze({
    status: 404,
    message: "El recurso solicitado no existe o no está disponible.",
  }),
  readOnly: Object.freeze({ status: 403, message: "Tu acceso a este congelador es de solo lectura." }),
  internal: Object.freeze({ status: 500, message: "Error interno del servidor." }),
})

function freezerAccessError(kind) {
  return FREEZER_ACCESS_ERRORS[kind] ?? FREEZER_ACCESS_ERRORS.internal
}

const FREEZER_ITEM_SELECT_FIELDS = `
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

const FREEZER_SELECT_FIELDS = `
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

const isMissingShareTableError = (error) => {
  if (!error) return false
  const haystack = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase()
  return haystack.includes(SHARE_TABLE) && MISSING_RELATION_MARKERS.some((marker) => haystack.includes(marker))
}

const sortItems = (items) =>
  Array.isArray(items)
    ? [...items].sort((left, right) => {
        const leftDate = left?.creado_en ? new Date(left.creado_en).getTime() : 0
        const rightDate = right?.creado_en ? new Date(right.creado_en).getTime() : 0
        return leftDate - rightDate
      })
    : []

const normalizeFreezer = (rawFreezer) => {
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

// Las memberships son datos históricos únicamente. Se conserva esta función
// como compatibilidad de importación, pero ningún rol de sharing autoriza el
// inventario actual (RF-23, RF-25).
const normalizeMembershipRole = (role, freezerOwnerId, userId) => {
  return null
}

// Identidad exclusivamente por la sesión de cookies del route handler (RF-1):
// no se acepta ningún token aportado por el cliente como autorización.
const resolveFreezerSessionUserId = async (authClient) => {
  if (!authClient || typeof authClient.auth?.getUser !== "function") {
    return null
  }
  const {
    data: { user } = {},
    error,
  } = await authClient.auth.getUser()

  if (error || !user?.id) {
    return null
  }

  return user.id
}

// Perfil vigente (RF-2): con la sesión del usuario, lee el perfil propio (RLS
// owner-only lo permite) y exige un rol exacto de la allowlist. La denegación
// genérica no detalla si falta el perfil, si el rol es nulo o si no está
// vigente; un fallo de lectura se trata como error interno sin filtrar SQL.
const requireActiveFreezerProfile = async (profileClient, userId) => {
  if (!userId) {
    return { ok: false, reason: "unauthenticated" }
  }
  if (!profileClient || typeof profileClient.from !== "function") {
    return { ok: false, reason: "internal" }
  }
  const { data, error } = await profileClient.from("user_profiles").select("role").eq("id", userId).maybeSingle()

  if (error) {
    return { ok: false, reason: "internal" }
  }

  const role = data?.role
  if (typeof role !== "string" || !ACTIVE_PROFILE_ROLES.includes(role)) {
    return { ok: false, reason: "profileDenied" }
  }

  return { ok: true, role }
}

// Autorización combinada reutilizable por las cinco rutas: sesión → perfil
// vigente. Devuelve la entrada uniforme de error (status + mensaje) o el
// usuario autorizado con el cliente de sesión para las siguientes comprobaciones.
const authorizeFreezerRequest = async (sessionClient, adminClient) => {
  const userId = await resolveFreezerSessionUserId(sessionClient)

  if (!userId) {
    return { ok: false, ...freezerAccessError("unauthenticated") }
  }

  const profile = await requireActiveFreezerProfile(sessionClient, userId)

  if (!profile.ok) {
    return { ok: false, ...freezerAccessError(profile.reason) }
  }

  // El adaptador de las rutas antiguas puede completar la comprobación de
  // propiedad mediante resolveFreezerAccess. Las nuevas rutas deben pasar el
  // cliente privilegiado para cerrar aquí la política completa.
  if (adminClient) {
    let access
    try {
      access = await getAccessibleFreezerForUser(adminClient, userId)
    } catch {
      return { ok: false, ...freezerAccessError("internal") }
    }
    if (!access) {
      return { ok: false, ...freezerAccessError("notFound") }
    }
  }

  return { ok: true, userId, sessionClient }
}

// Resultado de un intento de escritura (RF-23, RF-24): sin acceso → 404
// uniforme sin confirmar existencia; acceso válido de solo lectura → 403;
// owner/editor → autorizado (null).
const freezerWriteAccessOutcome = (access) => {
  if (!access?.hasAccess) {
    return freezerAccessError("notFound")
  }
  if (access.accessRole !== "owner") {
    return freezerAccessError("notFound")
  }
  return null
}

const getLegacyOwnedFreezerForUser = async (supabase, userId) => {
  const { data, error } = await supabase
    .from("congeladores")
    .select(FREEZER_SELECT_FIELDS)
    .eq("usuario_id", userId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw error
  }

  if (!data || data.usuario_id !== userId) {
    return null
  }

  return {
    freezer: normalizeFreezer(data),
    accessRole: "owner",
  }
}

const getAccessibleFreezerForUser = async (supabase, userId) => {
  // La consulta histórica por propietario es deliberadamente la única fuente
  // de acceso. No se enumeran memberships ni se concede sharing funcional.
  return getLegacyOwnedFreezerForUser(supabase, userId)
}

const ensureFreezerOwnerMembership = async (supabase, freezerId, userId) => {
  // Se mantiene el símbolo para consumidores históricos, pero T3 no crea ni
  // modifica memberships: el propietario persistido es autoritativo.
  return undefined
}

const resolveFreezerAccess = async (supabase, freezerId, userId) => {
  const { data: freezer, error: freezerError } = await supabase
    .from("congeladores")
    .select("id, usuario_id")
    .eq("id", freezerId)
    .maybeSingle()

  if (freezerError) {
    throw freezerError
  }

  if (freezer?.id === freezerId && freezer?.usuario_id === userId) {
    return {
      hasAccess: true,
      accessRole: "owner",
    }
  }

  return {
    hasAccess: false,
    accessRole: null,
  }
}

// Mensaje de validación del objetivo de cajones (RF-5, RF-27): texto del
// dominio, sin detalles internos.
const MENSAJE_FREEZER_ID_INVALIDO = "Falta el identificador del congelador."

// Mensajes de validación de elementos (RF-8–RF-17, RF-27): texto propio y
// comprensible en español, sin detalles internos. La cantidad y el estado
// reutilizan los mensajes del dominio de T2.
const MENSAJE_PAYLOAD_INVALIDO = "Payload inválido."
const MENSAJE_FALTA_CAJON = "Falta el cajón asociado."
const MENSAJE_FALTA_ITEM_ID = "Falta el identificador del elemento."
const MENSAJE_NOMBRE_OBLIGATORIO = "El nombre del elemento es obligatorio."
const MENSAJE_NOMBRE_EDICION = "El nombre es obligatorio."
const MENSAJE_RESERVADO_INVALIDO = "Valor inválido para reservado."
const MENSAJE_CAJON_INVALIDO = "Cajón inválido."
const MENSAJE_CAJON_NO_COINCIDE = "El cajón indicado no coincide."
const MENSAJE_UPDATES_INVALIDOS = "Datos de actualización inválidos."
const MENSAJE_SIN_CAMBIOS = "No hay cambios válidos para aplicar."
const MENSAJE_OTRO_CONGELADOR = "El cajón de destino no pertenece al mismo congelador."
const MENSAJE_FECHA_INVALIDA = "La fecha debe usar el formato YYYY-MM-DD."

// Límite del cuerpo (RF-24, RF-27): los payloads de elementos son pequeños; un
// cuerpo mayor se rechaza antes de analizarlo.
const FREEZER_BODY_MAX_BYTES = 65536

const freezerBodyExcedeLimite = (rawText) =>
  Buffer.byteLength(typeof rawText === "string" ? rawText : "", "utf8") > FREEZER_BODY_MAX_BYTES

// Campos permitidos del elemento (RF-24): allowlist cerrada; cualquier otro
// campo del cuerpo se ignora y nunca llega a la base de datos.
const CAMPOS_TEXTO_OPCIONALES = Object.freeze(["unidad", "categoria", "notas"])
const CAMPOS_FECHA_OPCIONALES = Object.freeze(["fecha_compra", "fecha_congelacion", "fecha_caducidad"])

const esObjetoSimple = (valor) => Boolean(valor) && typeof valor === "object" && !Array.isArray(valor)

const validarCampoTextoOpcional = (fuente, campo) => {
  const value = fuente[campo]
  if (value === null) return { ok: true, valor: null }
  if (typeof value !== "string") {
    return { ok: false, error: `Valor inválido para ${campo}.` }
  }
  const trimmed = value.trim()
  return { ok: true, valor: trimmed === "" ? null : trimmed }
}

// Fechas ISO YYYY-MM-DD (RF-11): validación de formato y fecha civil con el
// dominio de T2; sin orden cronológico impuesto entre ellas.
const validarCampoFechaOpcional = (fuente, campo) => {
  const value = fuente[campo]
  if (value === null) return { ok: true, valor: null }
  if (typeof value !== "string") {
    return { ok: false, error: `Valor inválido para ${campo}.` }
  }
  const trimmed = value.trim()
  if (trimmed === "") return { ok: true, valor: null }
  try {
    formatFechaMostrada(trimmed)
  } catch {
    return { ok: false, error: MENSAJE_FECHA_INVALIDA }
  }
  return { ok: true, valor: trimmed }
}

const validarCantidad = (fuente) => {
  if (!("cantidad" in fuente)) return { ok: true }
  try {
    return { ok: true, valor: parseCantidad(fuente.cantidad) }
  } catch (error) {
    return { ok: false, error: error?.message ?? "Cantidad inválida." }
  }
}

const validarEstado = (estado) => {
  try {
    return { ok: true, valor: parseEstado(estado) }
  } catch (error) {
    return { ok: false, error: error?.message ?? "Estado inválido." }
  }
}

// Validación del alta (RF-8–RF-11): nombre obligatorio, estado de catálogo,
// cantidad nula/cero/entero/decimal no negativo (acepta string con coma),
// campos opcionales tipados y reserva booleana. Devuelve el payload
// exclusivamente con campos de la allowlist.
const validarPayloadAlta = (body) => {
  if (!esObjetoSimple(body)) {
    return { ok: false, error: MENSAJE_PAYLOAD_INVALIDO }
  }

  const cajonId = typeof body.cajon_id === "string" ? body.cajon_id.trim() : ""
  if (!cajonId) {
    return { ok: false, error: MENSAJE_FALTA_CAJON }
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : ""
  if (!nombre) {
    return { ok: false, error: MENSAJE_NOMBRE_OBLIGATORIO }
  }

  const estado = validarEstado(body.estado)
  if (!estado.ok) {
    return estado
  }

  const payload = { cajon_id: cajonId, nombre, estado: estado.valor }

  const cantidad = validarCantidad(body)
  if (!cantidad.ok) return cantidad
  if ("cantidad" in body) {
    payload.cantidad = cantidad.valor
  }

  for (const campo of CAMPOS_TEXTO_OPCIONALES) {
    if (!(campo in body)) continue
    const resultado = validarCampoTextoOpcional(body, campo)
    if (!resultado.ok) return resultado
    payload[campo] = resultado.valor
  }

  for (const campo of CAMPOS_FECHA_OPCIONALES) {
    if (!(campo in body)) continue
    const resultado = validarCampoFechaOpcional(body, campo)
    if (!resultado.ok) return resultado
    payload[campo] = resultado.valor
  }

  if ("reservado" in body) {
    if (typeof body.reservado !== "boolean") {
      return { ok: false, error: MENSAJE_RESERVADO_INVALIDO }
    }
    payload.reservado = body.reservado
  }

  return { ok: true, payload }
}

// Validación de la edición (RF-12–RF-17): solo los campos presentes en
// `updates`; el movimiento (`cajon_id`) se valida aparte porque exige leer el
// cajón de destino.
const validarUpdatesEdicion = (updates) => {
  if (!esObjetoSimple(updates)) {
    return { ok: false, error: MENSAJE_UPDATES_INVALIDOS }
  }

  const cambios = {}

  if ("nombre" in updates) {
    const nombre = typeof updates.nombre === "string" ? updates.nombre.trim() : ""
    if (!nombre) {
      return { ok: false, error: MENSAJE_NOMBRE_EDICION }
    }
    cambios.nombre = nombre
  }

  if ("estado" in updates) {
    const estado = validarEstado(updates.estado)
    if (!estado.ok) return estado
    cambios.estado = estado.valor
  }

  const cantidad = validarCantidad(updates)
  if (!cantidad.ok) return cantidad
  if ("cantidad" in updates) {
    cambios.cantidad = cantidad.valor
  }

  for (const campo of CAMPOS_TEXTO_OPCIONALES) {
    if (!(campo in updates)) continue
    const resultado = validarCampoTextoOpcional(updates, campo)
    if (!resultado.ok) return resultado
    cambios[campo] = resultado.valor
  }

  for (const campo of CAMPOS_FECHA_OPCIONALES) {
    if (!(campo in updates)) continue
    const resultado = validarCampoFechaOpcional(updates, campo)
    if (!resultado.ok) return resultado
    cambios[campo] = resultado.valor
  }

  if ("reservado" in updates) {
    if (typeof updates.reservado !== "boolean") {
      return { ok: false, error: MENSAJE_RESERVADO_INVALIDO }
    }
    cambios.reservado = updates.reservado
  }

  return { ok: true, cambios }
}

const errorInterno = (origen, error) => {
  // Registro mínimo en servidor: solo el código, nunca mensajes SQL ni secretos.
  console.error(`[${origen}] Fallo de base de datos:`, error?.code ?? "desconocido")
  return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
}

const resultadoAcceso = (writeOutcome) => ({ status: writeOutcome.status, body: { error: writeOutcome.message } })

const leerDrawer = async (adminClient, drawerId) => {
  const { data, error } = await adminClient
    .from("cajones_congelador")
    .select("id, congelador_id")
    .eq("id", drawerId)
    .maybeSingle()
  if (error) throw error
  return data
}

const resolverAccesoCongelador = async (adminClient, freezerId, userId) => {
  try {
    return await resolveFreezerAccess(adminClient, freezerId, userId)
  } catch (error) {
    console.error("[api/freezer/items] Fallo al resolver el acceso:", error?.code ?? "desconocido")
    return null
  }
}

// Manejador puro de POST /api/freezer/items (RF-8–RF-11, RF-23–RF-24, RF-27):
// validación estricta del cuerpo con el dominio antes de autorizar la mutación,
// autorización combinada (sesión → perfil vigente), 404 uniforme para cajón
// inexistente o ajeno sin confirmar existencia y 403 de solo lectura para
// viewer. Éxito con el shape `{ item }` que consume freezer-manager.
const handleFreezerItemPost = async ({ sessionClient, adminClient, body }) => {
  const validacion = validarPayloadAlta(body)
  if (!validacion.ok) {
    return { status: 400, body: { error: validacion.error } }
  }

  // Resolver el singleton antes de inspeccionar el cajón evita que una
  // identidad admin sin propiedad vigente llegue a operar sobre un recurso
  // huérfano o de otro congelador.
  const auth = await authorizeFreezerRequest(sessionClient, adminClient)

  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.message } }
  }

  let drawer
  try {
    drawer = await leerDrawer(adminClient, validacion.payload.cajon_id)
  } catch (error) {
    return errorInterno("api/freezer/items", error)
  }

  if (!drawer?.congelador_id) {
    return { status: FREEZER_ACCESS_ERRORS.notFound.status, body: { error: FREEZER_ACCESS_ERRORS.notFound.message } }
  }

  const access = await resolverAccesoCongelador(adminClient, drawer.congelador_id, auth.userId)
  if (!access) {
    return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
  }

  const writeOutcome = freezerWriteAccessOutcome(access)
  if (writeOutcome) {
    return resultadoAcceso(writeOutcome)
  }

  let item
  try {
    const { data, error } = await adminClient
      .from("elementos_cajon")
      .insert(validacion.payload)
      .select(FREEZER_ITEM_SELECT_FIELDS)
      .maybeSingle()
    if (error) throw error
    item = data
  } catch (error) {
    return errorInterno("api/freezer/items", error)
  }

  if (!item) {
    console.error("[api/freezer/items] No se pudo recuperar el elemento creado.")
    return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
  }

  return { status: 200, body: { item } }
}

// Manejador puro de PATCH /api/freezer/items/[itemId] (RF-12–RF-17,
// RF-23–RF-24, RF-27): 404 uniforme para elemento inexistente o ajeno antes de
// revelar contenido, validación estricta de solo los campos presentes y
// movimiento exclusivo entre cajones del mismo congelador: toda la validación
// (incluido el cajón de destino) se resuelve antes de la única actualización
// atómica, de modo que ningún rechazo deja cambios parciales ni crea un estado
// intermedio. La reserva es un booleano reversible e informativo: no bloquea
// edición, movimiento ni borrado.
const handleFreezerItemPatch = async ({ sessionClient, adminClient, itemId, body }) => {
  if (typeof itemId !== "string" || itemId.trim() === "") {
    return { status: 400, body: { error: MENSAJE_FALTA_ITEM_ID } }
  }

  if (!esObjetoSimple(body)) {
    return { status: 400, body: { error: MENSAJE_PAYLOAD_INVALIDO } }
  }

  const drawerId = typeof body.drawerId === "string" ? body.drawerId.trim() : ""
  if (!drawerId) {
    return { status: 400, body: { error: MENSAJE_FALTA_CAJON } }
  }

  if (!esObjetoSimple(body.updates)) {
    return { status: 400, body: { error: MENSAJE_UPDATES_INVALIDOS } }
  }

  const auth = await authorizeFreezerRequest(sessionClient, adminClient)

  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.message } }
  }

  let itemRecord
  try {
    const { data, error } = await adminClient
      .from("elementos_cajon")
      .select(
        `
        id,
        cajon_id,
        cajones_congelador (
          id,
          congelador_id
        )
      `,
      )
      .eq("id", itemId)
      .maybeSingle()
    if (error) throw error
    itemRecord = data
  } catch (error) {
    return errorInterno("api/freezer/items/[itemId]", error)
  }

  if (!itemRecord) {
    return { status: FREEZER_ACCESS_ERRORS.notFound.status, body: { error: FREEZER_ACCESS_ERRORS.notFound.message } }
  }

  if (itemRecord.cajon_id !== drawerId) {
    return { status: 400, body: { error: MENSAJE_CAJON_NO_COINCIDE } }
  }

  const drawerActual = Array.isArray(itemRecord.cajones_congelador)
    ? itemRecord.cajones_congelador[0]
    : itemRecord.cajones_congelador
  const freezerActualId = drawerActual?.congelador_id ?? null

  if (!freezerActualId) {
    return { status: 400, body: { error: "No se pudo resolver el congelador del elemento." } }
  }

  const access = await resolverAccesoCongelador(adminClient, freezerActualId, auth.userId)
  if (!access) {
    return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
  }

  const writeOutcome = freezerWriteAccessOutcome(access)
  if (writeOutcome) {
    return resultadoAcceso(writeOutcome)
  }

  const validacion = validarUpdatesEdicion(body.updates)
  if (!validacion.ok) {
    return { status: 400, body: { error: validacion.error } }
  }

  const cambios = validacion.cambios

  if ("cajon_id" in body.updates) {
    const value = body.updates.cajon_id
    if (typeof value !== "string" || !value.trim()) {
      return { status: 400, body: { error: MENSAJE_CAJON_INVALIDO } }
    }
    const destinoId = value.trim()

    if (destinoId !== itemRecord.cajon_id) {
      let drawerDestino
      try {
        drawerDestino = await leerDrawer(adminClient, destinoId)
      } catch (error) {
        return errorInterno("api/freezer/items/[itemId]", error)
      }

      if (!drawerDestino?.congelador_id) {
        return {
          status: FREEZER_ACCESS_ERRORS.notFound.status,
          body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
        }
      }

      const accesoDestino = await resolverAccesoCongelador(adminClient, drawerDestino.congelador_id, auth.userId)
      if (!accesoDestino) {
        return {
          status: FREEZER_ACCESS_ERRORS.internal.status,
          body: { error: FREEZER_ACCESS_ERRORS.internal.message },
        }
      }

      // Ajeno → 404 uniforme sin confirmar existencia; con acceso pero otro
      // congelador → rechazo 400. La comprobación de acceso va primero para no
      // revelar si el recurso existe a quien carece de acceso.
      if (!accesoDestino.hasAccess) {
        return {
          status: FREEZER_ACCESS_ERRORS.notFound.status,
          body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
        }
      }

      if (accesoDestino.accessRole === "viewer") {
        return { status: FREEZER_ACCESS_ERRORS.readOnly.status, body: { error: FREEZER_ACCESS_ERRORS.readOnly.message } }
      }

      if (drawerDestino.congelador_id !== freezerActualId) {
        return { status: 400, body: { error: MENSAJE_OTRO_CONGELADOR } }
      }
    }

    cambios.cajon_id = destinoId
  }

  if (Object.keys(cambios).length === 0) {
    return { status: 400, body: { error: MENSAJE_SIN_CAMBIOS } }
  }

  let updatedItem
  try {
    const { data, error } = await adminClient
      .from("elementos_cajon")
      .update(cambios)
      .eq("id", itemId)
      .eq("cajon_id", drawerId)
      .select(FREEZER_ITEM_SELECT_FIELDS)
      .maybeSingle()
    if (error) throw error
    updatedItem = data
  } catch (error) {
    return errorInterno("api/freezer/items/[itemId]", error)
  }

  if (!updatedItem) {
    return { status: FREEZER_ACCESS_ERRORS.notFound.status, body: { error: FREEZER_ACCESS_ERRORS.notFound.message } }
  }

  return { status: 200, body: { item: updatedItem } }
}

// Manejador puro de DELETE /api/freezer/items/[itemId] (RF-16, RF-23–RF-24,
// RF-27): borrado individual definitivo, incluidos los elementos reservados.
// La lectura previa solo resuelve el congelador para autorizar: 404 uniforme
// para inexistente o ajeno sin revelar contenido, 403 de solo lectura para
// viewer y 500 genérico sin filtrar SQL.
const handleFreezerItemDelete = async ({ sessionClient, adminClient, itemId }) => {
  if (typeof itemId !== "string" || itemId.trim() === "") {
    return { status: 400, body: { error: MENSAJE_FALTA_ITEM_ID } }
  }

  const auth = await authorizeFreezerRequest(sessionClient, adminClient)

  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.message } }
  }

  let itemRecord
  try {
    const { data, error } = await adminClient
      .from("elementos_cajon")
      .select(
        `
        id,
        cajon_id,
        cajones_congelador (
          id,
          congelador_id
        )
      `,
      )
      .eq("id", itemId)
      .maybeSingle()
    if (error) throw error
    itemRecord = data
  } catch (error) {
    return errorInterno("api/freezer/items/[itemId]", error)
  }

  if (!itemRecord) {
    return { status: FREEZER_ACCESS_ERRORS.notFound.status, body: { error: FREEZER_ACCESS_ERRORS.notFound.message } }
  }

  const drawerActual = Array.isArray(itemRecord.cajones_congelador)
    ? itemRecord.cajones_congelador[0]
    : itemRecord.cajones_congelador
  const freezerId = drawerActual?.congelador_id ?? null

  if (!freezerId) {
    return { status: 400, body: { error: "No se pudo resolver el congelador del elemento." } }
  }

  const access = await resolverAccesoCongelador(adminClient, freezerId, auth.userId)
  if (!access) {
    return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
  }

  const writeOutcome = freezerWriteAccessOutcome(access)
  if (writeOutcome) {
    return resultadoAcceso(writeOutcome)
  }

  let deleteError = null
  try {
    const { error } = await adminClient.from("elementos_cajon").delete().eq("id", itemId)
    deleteError = error
  } catch (error) {
    deleteError = error
  }

  if (deleteError) {
    return errorInterno("api/freezer/items/[itemId]", deleteError)
  }

  return { status: 200, body: { success: true } }
}

// Manejador puro de POST /api/freezer/drawers (RF-5–RF-8, RF-23–RF-24, RF-27):
// contrato `{ freezerId, totalCajones }` (número objetivo, no un array de
// cajones calculado en cliente). Autorización combinada (sesión → perfil
// vigente) antes de cualquier acceso a datos, resolución de acceso/rol con el
// fallback de propietarios antiguos y política uniforme: sin acceso → 404 sin
// confirmar existencia, viewer → 403 solo-lectura. El servidor valida el
// objetivo (entero 1–5), rechaza la reducción con mensaje comprensible sin
// borrar nada, trata el valor igual como no-op 200 sin crear nada y calcula en
// servidor nombres «Cajón n» y posiciones continuas desde el máximo existente,
// creando exactamente los cajones nuevos en una única inserción atómica.
// Devuelve { status, body } sin filtrar mensajes SQL ni detalles internos.
const handleFreezerDrawersPost = async ({ sessionClient, adminClient, freezerId, totalCajones }) => {
  if (typeof freezerId !== "string" || freezerId.trim() === "") {
    return { status: 400, body: { error: MENSAJE_FREEZER_ID_INVALIDO } }
  }

  const auth = await authorizeFreezerRequest(sessionClient, adminClient)

  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.message } }
  }

  let access
  try {
    access = await resolveFreezerAccess(adminClient, freezerId, auth.userId)
  } catch (error) {
    console.error("[api/freezer/drawers] Fallo al resolver el acceso:", error?.code ?? "desconocido")
    return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
  }

  const writeOutcome = freezerWriteAccessOutcome(access)

  if (writeOutcome) {
    return { status: writeOutcome.status, body: { error: writeOutcome.message } }
  }

  const { data: existentes, error: readError } = await adminClient
    .from("cajones_congelador")
    .select("id, nombre, posicion")
    .eq("congelador_id", freezerId)

  if (readError) {
    console.error("[api/freezer/drawers] Fallo al leer los cajones:", readError?.code ?? "desconocido")
    return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
  }

  const lista = Array.isArray(existentes) ? existentes : []

  let decision
  try {
    decision = decidirCajones({ actuales: lista.length, solicitados: totalCajones })
  } catch (error) {
    // Validación del dominio (entero 1–5, reducción): rechazo en servidor sin
    // alterar el inventario. El mensaje es texto propio del dominio, no SQL.
    return { status: 400, body: { error: error?.message ?? FREEZER_ACCESS_ERRORS.internal.message } }
  }

  if (decision.tipo === "sin-cambios") {
    return { status: 200, body: { drawers: [] } }
  }

  const nuevos = buildCajonesNuevos({ existentes: lista, aCrear: decision.aCrear })
  const payload = nuevos.map((cajon) => ({
    nombre: cajon.nombre,
    posicion: cajon.posicion,
    descripcion: null,
    congelador_id: freezerId,
  }))

  const { data: creados, error: insertError } = await adminClient
    .from("cajones_congelador")
    .insert(payload)
    .select("id, nombre, posicion, descripcion, creado_en")

  if (insertError) {
    console.error("[api/freezer/drawers] Fallo al insertar cajones:", insertError?.code ?? "desconocido")
    return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
  }

  return { status: 200, body: { drawers: Array.isArray(creados) ? creados : [] } }
}

// Mensaje de validación del identificador de cajón para el vaciado (RF-27).
const MENSAJE_FALTA_CAJON_ID = "Falta el identificador del cajón."

// Manejador puro de DELETE /api/freezer/drawers/[drawerId]/items (RF-18–RF-19,
// RF-23–RF-24, RF-27): vaciado definitivo, persistente e inclusivo de los
// elementos reservados, dejando el cajón existente y vacío. Autorización
// combinada (sesión → perfil vigente), acceso/rol resuelto con el fallback de
// propietarios antiguos y comprobación de que el cajón pertenece al congelador
// accesible: 404 uniforme para cajón inexistente o ajeno sin confirmar
// existencia, 403 de solo lectura para viewer y 500 genérico sin filtrar SQL.
// La confirmación previa es presentación (T8): el servidor ejecuta la
// operación autorizada sin recibir confirmación, porque la confirmación no es
// autorización. No existe vaciado global: solo el cajón indicado.
const handleFreezerDrawerItemsDelete = async ({ sessionClient, adminClient, drawerId }) => {
  if (typeof drawerId !== "string" || drawerId.trim() === "") {
    return { status: 400, body: { error: MENSAJE_FALTA_CAJON_ID } }
  }

  const auth = await authorizeFreezerRequest(sessionClient, adminClient)

  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.message } }
  }

  let drawer
  try {
    drawer = await leerDrawer(adminClient, drawerId)
  } catch (error) {
    return errorInterno("api/freezer/drawers/[drawerId]/items", error)
  }

  if (!drawer?.congelador_id) {
    return { status: FREEZER_ACCESS_ERRORS.notFound.status, body: { error: FREEZER_ACCESS_ERRORS.notFound.message } }
  }

  const access = await resolverAccesoCongelador(adminClient, drawer.congelador_id, auth.userId)
  if (!access) {
    return { status: FREEZER_ACCESS_ERRORS.internal.status, body: { error: FREEZER_ACCESS_ERRORS.internal.message } }
  }

  const writeOutcome = freezerWriteAccessOutcome(access)
  if (writeOutcome) {
    return resultadoAcceso(writeOutcome)
  }

  let deleteError = null
  try {
    const { error } = await adminClient.from("elementos_cajon").delete().eq("cajon_id", drawerId)
    deleteError = error
  } catch (error) {
    deleteError = error
  }

  if (deleteError) {
    return errorInterno("api/freezer/drawers/[drawerId]/items", deleteError)
  }

  return { status: 200, body: { success: true } }
}

// Shape de respuesta preservado de GET /api/freezer (RF-3, RF-23, RF-24):
// { freezer, accessRole, isOwner }.
const buildFreezerResponse = (accessible) => ({
  freezer: accessible.freezer,
  accessRole: accessible.accessRole,
  isOwner: accessible.accessRole === "owner",
})

// Manejador puro de GET /api/freezer (RF-1–RF-4, RF-24, RF-27): autorización
// combinada (sesión → perfil vigente) antes de cualquier acceso a datos y
// resolución del único congelador existente mediante el fallback histórico del
// propietario. Este endpoint es de lectura: no auto-crea congeladores ni
// memberships. La ausencia del singleton devuelve una respuesta controlada y
// las peticiones ajenas no pueden enumerarlo.
const handleFreezerGet = async ({ sessionClient, adminClient }) => {
  const auth = await authorizeFreezerRequest(sessionClient)

  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.message } }
  }

  const accessible = await getAccessibleFreezerForUser(adminClient, auth.userId)

  if (accessible) {
    return { status: 200, body: buildFreezerResponse(accessible) }
  }

  return {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  }
}

module.exports = {
  ACTIVE_PROFILE_ROLES,
  CAMPOS_FECHA_OPCIONALES,
  CAMPOS_TEXTO_OPCIONALES,
  FREEZER_ACCESS_ERRORS,
  FREEZER_BODY_MAX_BYTES,
  MENSAJE_PAYLOAD_INVALIDO,
  buildFreezerResponse,
  freezerBodyExcedeLimite,
  handleFreezerDrawerItemsDelete,
  handleFreezerDrawersPost,
  handleFreezerGet,
  handleFreezerItemDelete,
  handleFreezerItemPatch,
  handleFreezerItemPost,
  validarPayloadAlta,
  validarUpdatesEdicion,
  FREEZER_ITEM_SELECT_FIELDS,
  FREEZER_SELECT_FIELDS,
  SHARE_ROLES,
  authorizeFreezerRequest,
  ensureFreezerOwnerMembership,
  freezerAccessError,
  freezerWriteAccessOutcome,
  getAccessibleFreezerForUser,
  isMissingShareTableError,
  normalizeFreezer,
  normalizeMembershipRole,
  requireActiveFreezerProfile,
  resolveFreezerAccess,
  resolveFreezerSessionUserId,
}
