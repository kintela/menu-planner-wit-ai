const { parseOwnedAvatarReference } = require("./domain")

const AVATAR_BUCKET = "avatars"
const AVATAR_SIGNED_URL_SECONDS = 5 * 60

/**
 * Map the avatar upload API contract to a truthful UI result. A partial state
 * is only considered successful when its code proves that association of the
 * new avatar completed before cleanup became incomplete.
 *
 * @param {{ state?: string, code?: string } | null | undefined} result
 * @param {boolean} responseOk
 * @returns {{ outcome: { kind: "success" | "error" | "warning", text: string }, succeeded: boolean }}
 */
function mapAvatarUploadResult(result, responseOk) {
  if (result?.state === "complete" && responseOk) {
    return {
      outcome: { kind: "success", text: "Avatar actualizado correctamente." },
      succeeded: true,
    }
  }

  if (result?.state === "partial" && result.code === "AVATAR_ASSOCIATION_FAILED_CLEANUP_FAILED") {
    return {
      outcome: {
        kind: "error",
        text: "No se pudo asociar el avatar nuevo; se conserva el anterior y queda pendiente limpiar el archivo nuevo.",
      },
      succeeded: false,
    }
  }

  if (result?.state === "partial" && result.code === "AVATAR_REPLACED_CLEANUP_FAILED") {
    return {
      outcome: {
        kind: "warning",
        text: "El avatar nuevo está activo, pero no se pudo eliminar el archivo anterior.",
      },
      succeeded: true,
    }
  }

  if (result?.state === "partial" && result.code === "AVATAR_REPLACED_PREVIOUS_UNVERIFIED") {
    return {
      outcome: {
        kind: "warning",
        text: "El avatar nuevo está activo, pero no se pudo verificar ni limpiar la referencia anterior.",
      },
      succeeded: true,
    }
  }

  if (result?.state === "partial") {
    return {
      outcome: {
        kind: "error",
        text: "La actualización del avatar quedó incompleta; no se puede confirmar que el avatar nuevo esté activo.",
      },
      succeeded: false,
    }
  }

  return {
    outcome: { kind: "error", text: "No se pudo actualizar el avatar; se conserva el anterior." },
    succeeded: false,
  }
}

/**
 * Convert the authenticated owner's persisted avatar reference into a
 * short-lived presentation URL. Canonical paths and historical untrusted
 * references are never returned to the browser as an image source.
 *
 * @param {any} supabase
 * @param {any} profile
 * @param {string} userId
 */
async function presentOwnProfile(supabase, profile, userId) {
  if (!profile) return profile
  if (!Object.prototype.hasOwnProperty.call(profile, "avatar_url")) return profile
  if (!profile.avatar_url) return { ...profile, avatar_url: null, has_custom_avatar: false }

  const path = parseOwnedAvatarReference(profile.avatar_url, userId)
  if (!path) return { ...profile, avatar_url: null, has_custom_avatar: true }

  try {
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, AVATAR_SIGNED_URL_SECONDS)
    const signedUrl = data?.signedUrl
    if (error || typeof signedUrl !== "string" || !signedUrl) {
      return { ...profile, avatar_url: null, has_custom_avatar: true }
    }
    return { ...profile, avatar_url: signedUrl, has_custom_avatar: true }
  } catch {
    return { ...profile, avatar_url: null, has_custom_avatar: true }
  }
}

module.exports = {
  AVATAR_SIGNED_URL_SECONDS,
  mapAvatarUploadResult,
  presentOwnProfile,
}
