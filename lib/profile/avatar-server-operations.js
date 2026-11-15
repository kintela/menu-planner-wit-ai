const { buildAvatarObjectPath, parseOwnedAvatarReference } = require("./domain")

const AVATAR_BUCKET = "avatars"
const MAX_AVATAR_FILE_BYTES = 5 * 1024 * 1024
const MAX_AVATAR_REQUEST_BYTES = MAX_AVATAR_FILE_BYTES + 64 * 1024
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
])

/**
 * Validate only the small, stable upload contract needed by Storage. The
 * domain path builder remains the authority for filename sanitation.
 *
 * @param {unknown} file
 * @returns {{ ok: true, value: any } | { ok: false }}
 */
function validateAvatarFile(file) {
  if (!file || typeof file !== "object") return { ok: false }
  if (
    typeof file.name !== "string" ||
    typeof file.type !== "string" ||
    typeof file.size !== "number" ||
    !Number.isFinite(file.size) ||
    file.size <= 0 ||
    file.size > MAX_AVATAR_FILE_BYTES ||
    !ALLOWED_AVATAR_MIME_TYPES.has(file.type.toLowerCase())
  ) {
    return { ok: false }
  }

  try {
    // Validation is delegated to the same helper used to create the path.
    buildAvatarObjectPath("00000000-0000-0000-0000-000000000000", file.name, new Date(0))
  } catch {
    return { ok: false }
  }

  return { ok: true, value: file }
}

/** @param {any} supabase */
async function authenticatedUser(supabase) {
  const { data, error } = await supabase.auth.getUser()
  return error || !data?.user ? null : data.user
}

/**
 * @param {any} supabase
 * @param {string} userId
 */
async function currentAvatarReference(supabase, userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle()

  if (error || !data) return { ok: false }
  return { ok: true, reference: data.avatar_url }
}

function response(status, state, code, details = {}) {
  return { status, body: { avatar: { state, code, ...details } } }
}

/**
 * Upload and associate a new avatar for the authenticated subject. Storage and
 * profile writes use the supplied cookie-session client and therefore remain
 * subject to RLS.
 *
 * @param {any} supabase
 * @param {unknown} file
 * @param {Date} hoy
 */
async function replaceOwnAvatar(supabase, file, hoy) {
  const validated = validateAvatarFile(file)
  if (!validated.ok) return response(400, "failed", "INVALID_AVATAR_FILE")

  try {
    const user = await authenticatedUser(supabase)
    if (!user) return response(401, "failed", "NOT_AUTHENTICATED")

    const current = await currentAvatarReference(supabase, user.id)
    if (!current.ok) return response(500, "failed", "AVATAR_PROFILE_READ_FAILED")

    let newPath
    try {
      newPath = buildAvatarObjectPath(user.id, validated.value.name, hoy)
    } catch {
      return response(400, "failed", "INVALID_AVATAR_FILE")
    }

    const storage = supabase.storage.from(AVATAR_BUCKET)
    const { error: uploadError } = await storage.upload(newPath, validated.value, {
      contentType: validated.value.type,
      upsert: false,
    })
    if (uploadError) return response(500, "failed", "AVATAR_UPLOAD_FAILED")

    const { error: associationError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: newPath })
      .eq("id", user.id)
      .select("avatar_url")
      .single()

    if (associationError) {
      const { error: cleanupError } = await storage.remove([newPath])
      if (cleanupError) {
        return response(207, "partial", "AVATAR_ASSOCIATION_FAILED_CLEANUP_FAILED", {
          cleanup: "failed",
        })
      }
      return response(500, "failed", "AVATAR_ASSOCIATION_FAILED", { cleanup: "complete" })
    }

    if (!current.reference) {
      return response(200, "complete", "AVATAR_REPLACED", {
        reference: newPath,
        cleanup: "not_applicable",
      })
    }

    const previousPath = parseOwnedAvatarReference(current.reference, user.id)
    if (!previousPath) {
      return response(207, "partial", "AVATAR_REPLACED_PREVIOUS_UNVERIFIED", {
        reference: newPath,
        cleanup: "not_attempted",
      })
    }

    if (previousPath !== newPath) {
      const { error: cleanupError } = await storage.remove([previousPath])
      if (cleanupError) {
        return response(207, "partial", "AVATAR_REPLACED_CLEANUP_FAILED", {
          reference: newPath,
          cleanup: "failed",
        })
      }
    }

    return response(200, "complete", "AVATAR_REPLACED", {
      reference: newPath,
      cleanup: "complete",
    })
  } catch {
    return response(500, "failed", "AVATAR_REPLACEMENT_FAILED")
  }
}

/**
 * Remove the authenticated user's current canonical avatar. Object deletion is
 * attempted first; if clearing the profile then fails, the stale reference is
 * reported as a partial result rather than as total success.
 *
 * @param {any} supabase
 */
async function deleteOwnAvatar(supabase) {
  try {
    const user = await authenticatedUser(supabase)
    if (!user) return response(401, "failed", "NOT_AUTHENTICATED")

    const current = await currentAvatarReference(supabase, user.id)
    if (!current.ok) return response(500, "failed", "AVATAR_PROFILE_READ_FAILED")
    if (!current.reference) {
      return response(200, "complete", "AVATAR_ALREADY_RESET", { reference: null })
    }

    const currentPath = parseOwnedAvatarReference(current.reference, user.id)
    if (!currentPath) return response(409, "failed", "AVATAR_REFERENCE_NOT_OWNED")

    const { error: deleteError } = await supabase.storage.from(AVATAR_BUCKET).remove([currentPath])
    if (deleteError) return response(500, "failed", "AVATAR_DELETE_FAILED")

    const { error: clearError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: null })
      .eq("id", user.id)
      .select("avatar_url")
      .single()

    if (clearError) return response(207, "partial", "AVATAR_DELETED_PROFILE_CLEAR_FAILED")
    return response(200, "complete", "AVATAR_RESET", { reference: null })
  } catch {
    return response(500, "failed", "AVATAR_RESET_FAILED")
  }
}

module.exports = {
  MAX_AVATAR_FILE_BYTES,
  MAX_AVATAR_REQUEST_BYTES,
  deleteOwnAvatar,
  replaceOwnAvatar,
  validateAvatarFile,
}
