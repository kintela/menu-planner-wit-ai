const {
  WeeklyMenuDomainError,
  buildWeekRange,
  canonicalizeMenuDraft,
  classifyWeek,
} = require("./weekly-menu-domain")
const { toPublicRecipe } = require("../recipes/recipe-domain")

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const READ_FIELDS = new Set(["week", "target"])
const SAVE_FIELDS = new Set(["week", "target", "slots"])
const TARGET_FIELDS = new Set(["target"])
const COPY_FIELDS = new Set(["sourceWeek", "destinationWeek", "target"])
const SLOT_BLUEPRINT = [
  ["comida", 1],
  ["comida", 2],
  ["cena", 1],
]

function errorResult(status, error) {
  return { status, body: { error } }
}

async function authenticatedUser(client) {
  if (!client?.auth || typeof client.auth.getUser !== "function") return null
  try {
    const { data, error } = await client.auth.getUser()
    return error ? null : data?.user ?? null
  } catch {
    return null
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function validateInputShape(input, fields, required) {
  if (!isPlainObject(input)) return false
  const keys = Object.keys(input)
  return required.every((field) => Object.prototype.hasOwnProperty.call(input, field)) &&
    keys.every((field) => fields.has(field))
}

function parseContext(input, hoy, fields, required) {
  if (!validateInputShape(input, fields, required)) throw new WeeklyMenuDomainError("INVALID_REQUEST", "invalid request")
  if (typeof input.week !== "string") throw new WeeklyMenuDomainError("INVALID_WEEK", "invalid week")
  const range = buildWeekRange(input.week, hoy)
  const target = Object.prototype.hasOwnProperty.call(input, "target") ? input.target : null
  if (target !== null && (typeof target !== "string" || !UUID_PATTERN.test(target))) {
    throw new WeeklyMenuDomainError("INVALID_TARGET", "invalid target")
  }
  if (Object.prototype.hasOwnProperty.call(input, "target") && target === null) {
    throw new WeeklyMenuDomainError("INVALID_TARGET", "invalid target")
  }
  return { range, target, classification: classifyWeek(input.week, hoy) }
}

function parseTarget(input) {
  if (!validateInputShape(input, TARGET_FIELDS, [])) throw new WeeklyMenuDomainError("INVALID_REQUEST", "invalid request")
  const target = Object.prototype.hasOwnProperty.call(input, "target") ? input.target : null
  if (target !== null && (typeof target !== "string" || !UUID_PATTERN.test(target))) {
    throw new WeeklyMenuDomainError("INVALID_TARGET", "invalid target")
  }
  if (Object.prototype.hasOwnProperty.call(input, "target") && target === null) {
    throw new WeeklyMenuDomainError("INVALID_TARGET", "invalid target")
  }
  return target
}

async function authorizeAdmin(client) {
  try {
    const { data, error } = await client.rpc("current_user_is_admin")
    if (error) return errorResult(500, "No se pudo comprobar la autorización")
    if (data !== true) return errorResult(403, "No tienes permisos para realizar esta operación")
    return null
  } catch {
    return errorResult(500, "No se pudo comprobar la autorización")
  }
}

async function authorizeActor(client) {
  try {
    const { data, error } = await client.rpc("weekly_menu_actor_is_authorized")
    if (error) return errorResult(500, "No se pudo comprobar la autorización")
    if (data !== true) return errorResult(403, "No tienes permisos para realizar esta operación")
    return null
  } catch {
    return errorResult(500, "No se pudo comprobar la autorización")
  }
}

async function authorizeTarget(client, target) {
  return target ? authorizeAdmin(client) : null
}

function persistenceError(error, action) {
  const marker = `${error?.code || ""} ${error?.message || ""}`
  if (/WM_AUTH_REQUIRED/.test(marker)) return errorResult(401, "Debes iniciar sesión")
  if (/WM_FORBIDDEN|WM_PAST_WEEK/.test(marker) || error?.code === "42501") {
    return errorResult(403, "No tienes permisos para realizar esta operación")
  }
  if (/WM_INVALID_WEEK|WM_INVALID_SLOTS|WM_DUPLICATE_SLOT|WM_RECIPE_UNAVAILABLE/.test(marker) ||
      ["22023", "23503", "23514"].includes(error?.code)) {
    return errorResult(400, "Los datos del menú no son válidos")
  }
  return errorResult(500, action)
}

function safeSnapshotRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("invalid snapshot")
  const first = rows[0]
  if (!isPlainObject(first) || typeof first.menu_exists !== "boolean" || typeof first.is_saved !== "boolean") {
    throw new Error("invalid snapshot")
  }
  const rawSlots = rows
    .filter((row) => row.recipe_id !== null && row.recipe_id !== undefined)
    .map((row) => ({
      day_of_week: row.day_of_week,
      meal_type: row.meal_type,
      dish_order: row.dish_order,
      recipe_id: row.recipe_id,
      sacado_del_congelador: row.sacado_del_congelador,
    }))
  return {
    exists: first.menu_exists,
    isSaved: first.is_saved,
    savedAt: typeof first.saved_at === "string" ? first.saved_at : null,
    target: first.target_ref && typeof first.target_label === "string"
      ? { ref: first.target_ref, label: first.target_label }
      : null,
    rawSlots,
  }
}

function slotKey(slot) {
  return `${slot.day_of_week}:${slot.meal_type}:${slot.dish_order}`
}

function buildDto(context, snapshot, recipeRows, hoy) {
  const saved = canonicalizeMenuDraft(snapshot.rawSlots, hoy)
  const recipes = (Array.isArray(recipeRows) ? recipeRows : []).map(toPublicRecipe)
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  for (const slot of saved) if (!recipesById.has(slot.recipe_id)) throw new Error("recipe projection missing")
  const occupiedBySlot = new Map(saved.map((slot) => [slotKey(slot), slot]))
  const slots = []
  for (let day = 0; day < 7; day += 1) {
    for (const [mealType, dishOrder] of SLOT_BLUEPRINT) {
      const identity = { day_of_week: day, meal_type: mealType, dish_order: dishOrder }
      const occupied = occupiedBySlot.get(slotKey(identity))
      slots.push(occupied ? {
        ...identity,
        occupied: true,
        recipe: recipesById.get(occupied.recipe_id),
        sacado_del_congelador: occupied.sacado_del_congelador,
      } : {
        ...identity,
        occupied: false,
        recipe: null,
        sacado_del_congelador: false,
      })
    }
  }
  return {
    week: {
      start_date: context.range.monday,
      end_date: context.range.sunday,
      dates: context.range.dates,
      classification: context.classification,
    },
    exists: snapshot.exists,
    is_saved: snapshot.isSaved,
    saved_at: snapshot.savedAt,
    saved_snapshot: saved,
    slots,
    editable: context.classification !== "past",
    recipes,
    ...(context.target && snapshot.target ? { target: snapshot.target } : {}),
  }
}

async function readAuthorizedSnapshot(client, context, hoy) {
  try {
    const snapshotResult = await client.rpc("get_weekly_menu_snapshot", {
      p_start_date: context.range.monday,
      p_target_ref: context.target,
    })
    if (snapshotResult.error) return { error: persistenceError(snapshotResult.error, "No se pudo obtener el menú semanal") }
    const recipesResult = await client.rpc("get_public_recipes", { p_recipe_id: null })
    if (recipesResult.error) return { error: errorResult(500, "No se pudo obtener el menú semanal") }
    const snapshot = safeSnapshotRows(snapshotResult.data)
    if (context.target && snapshot.target?.ref !== context.target) throw new Error("invalid target projection")
    return { dto: buildDto(context, snapshot, recipesResult.data, hoy) }
  } catch {
    return { error: errorResult(500, "No se pudo obtener el menú semanal") }
  }
}

async function readWeeklyMenu(client, input, hoy) {
  const user = await authenticatedUser(client)
  if (!user) return errorResult(401, "Debes iniciar sesión")
  let context
  try {
    context = parseContext(input, hoy, READ_FIELDS, ["week"])
  } catch {
    return errorResult(400, "La semana o el objetivo no son válidos")
  }
  const actorDenied = await authorizeActor(client)
  if (actorDenied) return actorDenied
  const denied = await authorizeTarget(client, context.target)
  if (denied) return denied
  const result = await readAuthorizedSnapshot(client, context, hoy)
  return result.error || { status: 200, body: result.dto }
}

async function saveWeeklyMenu(client, input, hoy) {
  const user = await authenticatedUser(client)
  if (!user) return errorResult(401, "Debes iniciar sesión")
  let context
  let slots
  try {
    context = parseContext(input, hoy, SAVE_FIELDS, ["week", "slots"])
    slots = canonicalizeMenuDraft(input.slots, hoy)
  } catch {
    return errorResult(400, "Los datos del menú no son válidos")
  }
  if (context.classification === "past") return errorResult(403, "No se pueden modificar semanas pasadas")
  const actorDenied = await authorizeActor(client)
  if (actorDenied) return actorDenied
  const denied = await authorizeTarget(client, context.target)
  if (denied) return denied
  try {
    const { error } = await client.rpc("save_weekly_menu", {
      p_start_date: context.range.monday,
      p_slots: slots,
      p_target_ref: context.target,
    })
    if (error) return persistenceError(error, "No se pudo guardar el menú semanal")
  } catch {
    return errorResult(500, "No se pudo guardar el menú semanal")
  }
  const persisted = await readAuthorizedSnapshot(client, context, hoy)
  if (persisted.error) return persisted.error
  return { status: 200, body: { success: true, menu: persisted.dto } }
}

async function emptyWeeklyMenu(client, input, hoy) {
  const user = await authenticatedUser(client)
  if (!user) return errorResult(401, "Debes iniciar sesión")
  let context
  try {
    context = parseContext(input, hoy, READ_FIELDS, ["week"])
  } catch {
    return errorResult(400, "La semana o el objetivo no son válidos")
  }
  if (context.classification === "past") return errorResult(403, "No se pueden modificar semanas pasadas")
  const actorDenied = await authorizeActor(client)
  if (actorDenied) return actorDenied
  const denied = await authorizeTarget(client, context.target)
  if (denied) return denied
  try {
    const { data, error } = await client.rpc("empty_weekly_menu", {
      p_start_date: context.range.monday,
      p_target_ref: context.target,
    })
    if (error) return persistenceError(error, "No se pudo vaciar el menú semanal")
    if (typeof data !== "boolean") return errorResult(500, "No se pudo vaciar el menú semanal")
    return { status: 200, body: { success: true, removed: data, exists: false } }
  } catch {
    return errorResult(500, "No se pudo vaciar el menú semanal")
  }
}

function safeSourceRows(rows, hoy) {
  if (!Array.isArray(rows)) throw new Error("invalid sources")
  return rows.map(row => {
    if (!isPlainObject(row) || typeof row.start_date !== "string" ||
        typeof row.end_date !== "string" || typeof row.source_label !== "string" || !row.source_label) {
      throw new Error("invalid source")
    }
    const range = buildWeekRange(row.start_date, hoy)
    if (range.sunday !== row.end_date) throw new Error("invalid source range")
    return { start_date: row.start_date, end_date: row.end_date, label: row.source_label }
  })
}

async function listWeeklyMenuSources(client, input, hoy) {
  const user = await authenticatedUser(client)
  if (!user) return errorResult(401, "Debes iniciar sesión")
  let target
  try {
    target = parseTarget(input)
  } catch {
    return errorResult(400, "El objetivo no es válido")
  }
  const actorDenied = await authorizeActor(client)
  if (actorDenied) return actorDenied
  const denied = await authorizeTarget(client, target)
  if (denied) return denied
  try {
    const { data, error } = await client.rpc("get_weekly_menu_sources", { p_target_ref: target })
    if (error) return persistenceError(error, "No se pudieron obtener las semanas guardadas")
    return { status: 200, body: { sources: safeSourceRows(data, hoy) } }
  } catch {
    return errorResult(500, "No se pudieron obtener las semanas guardadas")
  }
}

function parseCopyContext(input, hoy) {
  if (!validateInputShape(input, COPY_FIELDS, ["sourceWeek", "destinationWeek"]) ||
      typeof input.sourceWeek !== "string" || typeof input.destinationWeek !== "string") {
    throw new WeeklyMenuDomainError("INVALID_REQUEST", "invalid request")
  }
  const target = parseTarget(Object.prototype.hasOwnProperty.call(input, "target") ? { target: input.target } : {})
  const sourceRange = buildWeekRange(input.sourceWeek, hoy)
  const destinationRange = buildWeekRange(input.destinationWeek, hoy)
  return {
    target,
    sourceRange,
    destinationRange,
    destinationClassification: classifyWeek(input.destinationWeek, hoy),
  }
}

async function copyWeeklyMenu(client, input, hoy) {
  const user = await authenticatedUser(client)
  if (!user) return errorResult(401, "Debes iniciar sesión")
  let context
  try {
    context = parseCopyContext(input, hoy)
  } catch {
    return errorResult(400, "Las semanas o el objetivo no son válidos")
  }
  if (context.destinationClassification === "past") {
    return errorResult(403, "No se puede copiar a una semana pasada")
  }
  const actorDenied = await authorizeActor(client)
  if (actorDenied) return actorDenied
  const denied = await authorizeTarget(client, context.target)
  if (denied) return denied
  const sourceContext = {
    range: context.sourceRange,
    target: context.target,
    classification: classifyWeek(context.sourceRange.monday, hoy),
  }
  const source = await readAuthorizedSnapshot(client, sourceContext, hoy)
  if (source.error) return source.error
  if (!source.dto.exists || !source.dto.is_saved) return errorResult(404, "El menú de origen no está disponible")
  const destinationWeek = {
    start_date: context.destinationRange.monday,
    end_date: context.destinationRange.sunday,
    dates: context.destinationRange.dates,
    classification: context.destinationClassification,
  }
  return {
    status: 200,
    body: {
      draft: {
        week: destinationWeek,
        saved_snapshot: source.dto.saved_snapshot.map(slot => ({ ...slot })),
        slots: source.dto.slots.map(slot => ({
          ...slot,
          recipe: slot.recipe ? { ...slot.recipe } : null,
        })),
        ...(source.dto.target ? { target: { ...source.dto.target } } : {}),
      },
    },
  }
}

function safeAdminTargets(rows) {
  if (!Array.isArray(rows)) throw new Error("invalid targets")
  return rows.map(row => {
    if (!isPlainObject(row) || typeof row.target_ref !== "string" || !UUID_PATTERN.test(row.target_ref) ||
        typeof row.target_label !== "string" || !row.target_label) throw new Error("invalid target")
    return { ref: row.target_ref, label: row.target_label }
  })
}

async function listWeeklyMenuAdminTargets(client) {
  const user = await authenticatedUser(client)
  if (!user) return errorResult(401, "Debes iniciar sesión")
  const actorDenied = await authorizeActor(client)
  if (actorDenied) return actorDenied
  const denied = await authorizeAdmin(client)
  if (denied) return denied
  try {
    const { data, error } = await client.rpc("get_weekly_menu_admin_targets")
    if (error) return persistenceError(error, "No se pudieron obtener los objetivos de administración")
    return { status: 200, body: { targets: safeAdminTargets(data) } }
  } catch {
    return errorResult(500, "No se pudieron obtener los objetivos de administración")
  }
}

module.exports = {
  copyWeeklyMenu,
  emptyWeeklyMenu,
  listWeeklyMenuAdminTargets,
  listWeeklyMenuSources,
  readWeeklyMenu,
  saveWeeklyMenu,
}
