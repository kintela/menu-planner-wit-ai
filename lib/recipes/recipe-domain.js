const PUBLIC_RECIPE_FIELDS = [
  "id",
  "name",
  "ingredients",
  "preparation",
  "image_url",
  "is_ai_generated",
  "created_at",
  "video_url",
  "source_url",
  "calories",
]

function parsePositiveInteger(value) {
  if (typeof value !== "number" && typeof value !== "string") return null
  if (typeof value === "string" && !/^[1-9]\d*$/.test(value)) return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function parseRecipeId(value) {
  return parsePositiveInteger(value)
}

function parseCategoryId(value) {
  return parsePositiveInteger(value)
}

function normalizeCategoryName(value) {
  if (typeof value !== "string") return null
  const name = value.trim()
  if (!name) return null
  return { name, comparisonKey: name.toLocaleLowerCase("es") }
}

function nullableTrimmedString(value) {
  if (typeof value !== "string") return null
  return value.trim() || null
}

function requiredDate(hoy) {
  if (!(hoy instanceof Date) || Number.isNaN(hoy.getTime())) throw new TypeError("invalid hoy")
  return hoy
}

function buildRecipeMutation(input, actorId, hoy) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {}
  const calories = source.calories === null || source.calories === "" || source.calories === undefined
    ? null
    : Number(source.calories)

  return {
    name: typeof source.name === "string" ? source.name.trim() : "",
    ingredients: typeof source.ingredients === "string" ? source.ingredients : "",
    preparation: typeof source.preparation === "string" ? source.preparation : "",
    is_ai_generated: source.is_ai_generated === true || source.is_ai_generated === 1,
    video_url: nullableTrimmedString(source.video_url),
    source_url: nullableTrimmedString(source.source_url),
    calories: Number.isInteger(calories) ? calories : null,
    user_id: actorId,
    created_at: requiredDate(hoy).toISOString(),
  }
}

function canManageRecipe({ actorId, actorRole, ownerId }) {
  if (!actorId) return false
  return actorRole === "admin" || actorId === ownerId
}

function validateRating(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null
}

function buildManagedRecipeImagePath(recipeId, fileName, hoy) {
  const parsedId = parseRecipeId(recipeId)
  if (!parsedId || typeof fileName !== "string") throw new TypeError("invalid image path")
  const trimmed = fileName.trim()
  let decoded = trimmed
  try { decoded = decodeURIComponent(trimmed) } catch { throw new TypeError("invalid image path") }
  if (!trimmed || /[/\\]/.test(decoded) || decoded.includes("..")) throw new TypeError("invalid image path")
  const safeName = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/-+/g, "-")
  if (!safeName || safeName === "." || safeName === "..") throw new TypeError("invalid image path")
  return `${parsedId}/${requiredDate(hoy).getTime()}-${safeName}`
}

function classifyImageTransition(previous, next, outcome = {}) {
  if (!outcome.uploaded) return { status: "failed", active: previous ?? null, cleanupRequired: false }
  if (!outcome.associated) {
    return {
      status: outcome.newImageCleaned === false ? "partial" : "failed",
      active: previous ?? null,
      cleanupRequired: outcome.newImageCleaned === false,
    }
  }
  if (outcome.previousImageCleaned === false) {
    return { status: "partial", active: next ?? null, cleanupRequired: true }
  }
  return { status: "success", active: next ?? null, cleanupRequired: false }
}

function normalizePublicCategory(value) {
  if (!value || typeof value !== "object") return null
  const id = parseCategoryId(value.id)
  const normalized = normalizeCategoryName(value.name)
  return id && normalized ? { id, name: normalized.name } : null
}

function toPublicRecipe(row) {
  const source = row && typeof row === "object" ? row : {}
  const dto = {}
  for (const field of PUBLIC_RECIPE_FIELDS) {
    if (field === "id") dto.id = parseRecipeId(source.id) || 0
    else if (field === "name") dto.name = typeof source.name === "string" ? source.name : ""
    else if (field === "ingredients" || field === "preparation") dto[field] = typeof source[field] === "string" ? source[field] : ""
    else if (field === "is_ai_generated") dto[field] = source[field] === true
    else dto[field] = source[field] ?? null
  }
  dto.categories = Array.isArray(source.categories) ? source.categories.map(normalizePublicCategory).filter(Boolean) : []
  dto.author_alias = typeof source.author_alias === "string" && source.author_alias.trim()
    ? source.author_alias.trim()
    : "Usuario"
  const average = source.rating_average === null || source.rating_average === undefined ? null : Number(source.rating_average)
  dto.rating_average = Number.isFinite(average) ? average : null
  const count = Number(source.rating_count)
  dto.rating_count = Number.isSafeInteger(count) && count >= 0 ? count : 0
  return dto
}

module.exports = {
  buildManagedRecipeImagePath,
  buildRecipeMutation,
  canManageRecipe,
  classifyImageTransition,
  normalizeCategoryName,
  parseCategoryId,
  parseRecipeId,
  toPublicRecipe,
  validateRating,
}
