const { buildManagedRecipeImagePath, parseRecipeId } = require("./recipe-domain")

const RECIPE_IMAGE_BUCKET = "recipe-images"
const MAX_RECIPE_IMAGE_FILE_BYTES = 5 * 1024 * 1024
const MAX_RECIPE_IMAGE_REQUEST_BYTES = MAX_RECIPE_IMAGE_FILE_BYTES + 64 * 1024
const ALLOWED_MIME_TYPES = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"])
const AUTHENTICATED_ROLES = new Set(["user_restricted", "user_full", "admin"])

function response(status, state, code, details = {}) {
  return { status, body: { image: { state, code, ...details } } }
}

function validateRecipeImageFile(file) {
  if (!file || typeof file !== "object" || typeof file.name !== "string" || typeof file.type !== "string" ||
      typeof file.size !== "number" || !Number.isFinite(file.size) || file.size <= 0 ||
      file.size > MAX_RECIPE_IMAGE_FILE_BYTES || !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) return { ok: false }
  try { buildManagedRecipeImagePath(1, file.name, new Date(0)) } catch { return { ok: false } }
  return { ok: true, value: file }
}

function accreditedPath(recipeId, value) {
  if (typeof value !== "string" || !/^[1-9][0-9]*\/[^/]+$/.test(value)) return null
  return recipeId === undefined || value.startsWith(`${recipeId}/`) ? value : null
}

async function requireRecipeManager(client, rawId) {
  const recipeId = parseRecipeId(rawId)
  if (!recipeId) return { error: response(400, "failed", "INVALID_RECIPE_ID") }
  try {
    const { data: authData, error: authError } = await client.auth.getUser()
    const user = authError ? null : authData?.user
    if (!user) return { error: response(401, "failed", "NOT_AUTHENTICATED") }
    const { data: profile, error: profileError } = await client.from("user_profiles").select("role").eq("id", user.id).single()
    if (profileError || !AUTHENTICATED_ROLES.has(profile?.role)) return { error: response(403, "failed", "RECIPE_IMAGE_NOT_AUTHORIZED") }
    const { data: allowed, error } = await client.rpc("can_manage_recipe", { p_recipe_id: recipeId })
    if (error) return { error: response(500, "failed", "RECIPE_IMAGE_AUTHORIZATION_FAILED") }
    if (allowed !== true) return { error: response(403, "failed", "RECIPE_IMAGE_NOT_AUTHORIZED") }
    return { recipeId }
  } catch {
    return { error: response(500, "failed", "RECIPE_IMAGE_AUTHORIZATION_FAILED") }
  }
}

async function removeObject(storage, path) {
  try { return !(await storage.remove([path])).error } catch { return false }
}

async function finalizeCleanup(client, path) {
  try {
    const { data, error } = await client.rpc("finalize_recipe_image_cleanup", { p_object_path: path })
    return !error && data === true
  } catch { return false }
}

async function cleanupNewAfterFailure(client, storage, newPath) {
  const cleaned = await removeObject(storage, newPath)
  const finalized = cleaned && await finalizeCleanup(client, newPath)
  return response(finalized ? 500 : 207, finalized ? "failed" : "partial", finalized ? "RECIPE_IMAGE_ASSOCIATION_FAILED" : "RECIPE_IMAGE_ASSOCIATION_FAILED_CLEANUP_FAILED", { cleanup: finalized ? "complete" : "failed" })
}

async function replaceRecipeImage(client, rawId, file, hoy) {
  const validated = validateRecipeImageFile(file)
  if (!validated.ok) return response(400, "failed", "INVALID_RECIPE_IMAGE_FILE")
  const manager = await requireRecipeManager(client, rawId)
  if (manager.error) return manager.error
  try {
    let newPath
    try { newPath = buildManagedRecipeImagePath(manager.recipeId, validated.value.name, hoy) } catch { return response(400, "failed", "INVALID_RECIPE_IMAGE_FILE") }
    const storage = client.storage.from(RECIPE_IMAGE_BUCKET)
    const { error: uploadError } = await storage.upload(newPath, validated.value, { contentType: validated.value.type.toLowerCase(), upsert: false })
    if (uploadError) return response(500, "failed", "RECIPE_IMAGE_UPLOAD_FAILED")
    const publicUrl = storage.getPublicUrl(newPath)?.data?.publicUrl
    if (typeof publicUrl !== "string" || !publicUrl) return cleanupNewAfterFailure(client, storage, newPath)

    const { data, error: associationError } = await client.rpc("associate_recipe_image", {
      p_recipe_id: manager.recipeId,
      p_object_path: newPath,
      p_image_url: publicUrl,
    })
    if (associationError) return cleanupNewAfterFailure(client, storage, newPath)
    const transition = Array.isArray(data) ? data[0] : data
    if (transition?.active_url !== publicUrl) return cleanupNewAfterFailure(client, storage, newPath)
    const previousPath = accreditedPath(manager.recipeId, transition.cleanup_path)
    if (previousPath && (!(await removeObject(storage, previousPath)) || !(await finalizeCleanup(client, previousPath)))) {
      return response(207, "partial", "RECIPE_IMAGE_REPLACED_CLEANUP_FAILED", { url: publicUrl, cleanup: "failed" })
    }
    return response(200, "complete", "RECIPE_IMAGE_REPLACED", { url: publicUrl, cleanup: previousPath ? "complete" : "not_applicable" })
  } catch {
    return response(500, "failed", "RECIPE_IMAGE_REPLACEMENT_FAILED")
  }
}

async function deleteRecipeImage(client, rawId) {
  const manager = await requireRecipeManager(client, rawId)
  if (manager.error) return manager.error
  try {
    const { data, error } = await client.rpc("clear_recipe_image", { p_recipe_id: manager.recipeId })
    if (error) return response(error.code === "P0002" ? 404 : 500, "failed", "RECIPE_IMAGE_DISASSOCIATION_FAILED")
    const transition = Array.isArray(data) ? data[0] : data
    const cleanupPath = accreditedPath(manager.recipeId, transition?.cleanup_path)
    if (cleanupPath) {
      const storage = client.storage.from(RECIPE_IMAGE_BUCKET)
      if (!(await removeObject(storage, cleanupPath)) || !(await finalizeCleanup(client, cleanupPath))) return response(207, "partial", "RECIPE_IMAGE_REMOVED_CLEANUP_FAILED", { url: null, cleanup: "failed" })
    }
    return response(200, "complete", "RECIPE_IMAGE_REMOVED", { url: null, cleanup: cleanupPath ? "complete" : "not_applicable" })
  } catch {
    return response(500, "failed", "RECIPE_IMAGE_REMOVAL_FAILED")
  }
}

async function cleanupDeletedRecipeImage(client, deletionResult) {
  if (deletionResult?.status !== 200 || !deletionResult.cleanupContext) return deletionResult
  const { managedImagePath } = deletionResult.cleanupContext
  const path = accreditedPath(undefined, managedImagePath)
  if (!path) return { status: deletionResult.status, body: deletionResult.body }
  try {
    if (await removeObject(client.storage.from(RECIPE_IMAGE_BUCKET), path) && await finalizeCleanup(client, path)) return { status: deletionResult.status, body: deletionResult.body }
  } catch {
    // The recipe is already deleted; a storage failure can only be reported.
  }
  return { status: 207, body: { success: false, partial: true, deleted: true, code: "RECIPE_DELETED_IMAGE_CLEANUP_FAILED" } }
}

module.exports = {
  MAX_RECIPE_IMAGE_FILE_BYTES,
  MAX_RECIPE_IMAGE_REQUEST_BYTES,
  cleanupDeletedRecipeImage,
  deleteRecipeImage,
  replaceRecipeImage,
  validateRecipeImageFile,
}
