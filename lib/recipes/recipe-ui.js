const SAFE_RECIPE_KEYS = [
  "id", "name", "ingredients", "preparation", "image_url", "is_ai_generated",
  "created_at", "video_url", "source_url", "calories", "categories", "rating_average",
  "rating_count", "can_edit", "can_delete", "is_owner", "my_rating", "menu_ids",
  "author_filter_key", "author_filter_label",
]

const MUTATION_KEYS = [
  "name", "ingredients", "preparation", "image_url", "is_ai_generated", "video_url",
  "source_url", "calories", "categories", "rating",
]

function normalizeRecipeForPresentation(value) {
  const source = value && typeof value === "object" ? value : {}
  const recipe = {}
  for (const key of SAFE_RECIPE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) recipe[key] = source[key]
  }
  recipe.author_alias = typeof source.author_alias === "string" && source.author_alias.trim()
    ? source.author_alias.trim()
    : "Usuario"
  if (Array.isArray(source.menu_ids)) recipe.menu_ids = [...source.menu_ids]
  return recipe
}

function buildJsonRequest(method, payload) {
  const request = { method, headers: { "Content-Type": "application/json" } }
  if (payload !== undefined && method !== "DELETE") {
    const safePayload = {}
    for (const key of MUTATION_KEYS) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) safePayload[key] = payload[key]
    }
    request.body = JSON.stringify(safePayload)
  }
  return request
}

function responseError(payload, fallback) {
  return typeof payload?.error === "string" && payload.error ? payload.error : fallback
}

function imageResultMessage(image) {
  switch (image?.code) {
    case "RECIPE_IMAGE_REPLACED": return "La imagen se ha actualizado correctamente."
    case "RECIPE_IMAGE_REPLACED_CLEANUP_PENDING":
    case "RECIPE_IMAGE_REPLACED_CLEANUP_FAILED": return "La imagen nueva está activa; la limpieza de la anterior queda pendiente."
    case "RECIPE_IMAGE_REMOVED": return "La imagen se ha retirado correctamente."
    case "RECIPE_IMAGE_REMOVED_CLEANUP_PENDING":
    case "RECIPE_IMAGE_REMOVED_CLEANUP_FAILED": return "La receta ya no muestra la imagen; su limpieza queda pendiente."
    case "RECIPE_IMAGE_ASSOCIATION_FAILED_CLEANUP_PENDING":
    case "RECIPE_IMAGE_ASSOCIATION_FAILED_CLEANUP_FAILED": return "La receta conserva su imagen anterior y quedó un residuo de carga pendiente de limpieza."
    case "RECIPE_IMAGE_ASSOCIATION_FAILED": return "La receta conserva su imagen anterior porque no se pudo asociar la nueva."
    case "RECIPE_IMAGE_ASSOCIATION_FAILED_RESTORE_FAILED":
      return image?.active_url
        ? `La imagen nueva está activa (${image.active_url}), pero no se pudo completar la acreditación de su limpieza.`
        : "El cambio quedó parcial y no se pudo determinar con seguridad qué imagen está activa."
    default: return "No se pudo completar el cambio de imagen y no se pudo determinar con seguridad el estado activo."
  }
}

function imageResultActiveUrl(image) {
  if (image?.code === "RECIPE_IMAGE_ASSOCIATION_FAILED_RESTORE_FAILED" && typeof image.active_url === "string" && image.active_url) return image.active_url
  if ((image?.code === "RECIPE_IMAGE_REPLACED" || image?.code === "RECIPE_IMAGE_REPLACED_CLEANUP_FAILED" || image?.code === "RECIPE_IMAGE_REPLACED_CLEANUP_PENDING") && typeof image.url === "string" && image.url) return image.url
  if (image?.url === null && (image?.state === "complete" || image?.state === "partial")) return null
  return undefined
}

function ratingResultMessage(ok, payload) {
  if (!ok) return responseError(payload, "No se pudo actualizar la valoración.")
  return payload?.removed ? "Tu valoración se ha retirado." : "Tu valoración se ha guardado."
}

function categoryResultMessage(ok, payload) {
  if (!ok) return responseError(payload, "No se pudo completar la operación de categoría.")
  return "La categoría se ha actualizado correctamente."
}

function canCreateRecipe(role) {
  return role === "user_restricted" || role === "user_full" || role === "admin"
}

module.exports = {
  buildJsonRequest,
  imageResultActiveUrl,
  imageResultMessage,
  normalizeRecipeForPresentation,
  ratingResultMessage,
  categoryResultMessage,
  canCreateRecipe,
}
