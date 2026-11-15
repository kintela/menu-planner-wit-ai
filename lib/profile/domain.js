const AVATAR_BUCKET = "avatars"
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeOptionalText(value) {
  if (typeof value !== "string") return null
  return value.trim() || null
}

/**
 * @param {unknown} hoy
 * @returns {Date}
 */
function requireValidDate(hoy) {
  if (!(hoy instanceof Date) || !Number.isFinite(hoy.getTime())) {
    throw new TypeError("Invalid explicit date")
  }

  return hoy
}

/**
 * @param {unknown} userId
 * @returns {string}
 */
function requireUserId(userId) {
  if (typeof userId !== "string" || !UUID_PATTERN.test(userId)) {
    throw new TypeError("Invalid user id")
  }

  return userId
}

/**
 * Build the database update for the editable profile fields only.
 *
 * @param {unknown} input
 * @param {Date} hoy
 * @returns {{
 *   first_name: string | null,
 *   last_name: string | null,
 *   alias: string | null,
 *   phone: string | null,
 *   full_name: string | null,
 *   updated_at: string,
 * }}
 */
function buildProfileUpdate(input, hoy) {
  const date = requireValidDate(hoy)
  const source = input && typeof input === "object" ? input : {}
  const firstName = normalizeOptionalText(source.first_name)
  const lastName = normalizeOptionalText(source.last_name)

  return {
    first_name: firstName,
    last_name: lastName,
    alias: normalizeOptionalText(source.alias),
    phone: normalizeOptionalText(source.phone),
    full_name: [firstName, lastName].filter(Boolean).join(" ") || null,
    updated_at: date.toISOString(),
  }
}

/**
 * @param {unknown} fileName
 * @returns {string}
 */
function sanitizeFileName(fileName) {
  if (typeof fileName !== "string") throw new TypeError("Invalid file name")

  const trimmed = fileName.trim()
  let decoded
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    throw new TypeError("Invalid file name")
  }

  if (
    !trimmed ||
    decoded.includes("/") ||
    decoded.includes("\\") ||
    decoded.includes("..") ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  ) {
    throw new TypeError("Invalid file name")
  }

  const extensionIndex = decoded.lastIndexOf(".")
  const rawBase = extensionIndex > 0 ? decoded.slice(0, extensionIndex) : decoded
  const rawExtension = extensionIndex > 0 ? decoded.slice(extensionIndex + 1) : ""
  const base = rawBase
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const extension = rawExtension.replace(/[^a-zA-Z0-9]+/g, "")

  if (!base) throw new TypeError("Invalid file name")
  return extension ? `${base}.${extension}` : base
}

/**
 * @param {unknown} userId
 * @param {unknown} fileName
 * @param {Date} hoy
 * @returns {string}
 */
function buildAvatarObjectPath(userId, fileName, hoy) {
  const ownerId = requireUserId(userId)
  const safeFileName = sanitizeFileName(fileName)
  const timestamp = requireValidDate(hoy).getTime()

  return `${ownerId}/${timestamp}-${safeFileName}`
}

/**
 * Return the path relative to the private avatars bucket when the reference is
 * canonical and owned by the given user. URLs are deliberately not authority.
 *
 * @param {unknown} reference
 * @param {unknown} userId
 * @returns {string | null}
 */
function parseOwnedAvatarReference(reference, userId) {
  if (typeof reference !== "string" || !UUID_PATTERN.test(String(userId))) return null
  if (!reference || reference.trim() !== reference || reference.includes("://")) return null
  if (reference.startsWith("/") || /[\\?#%\u0000-\u001f\u007f]/.test(reference)) return null

  const bucketPrefix = `${AVATAR_BUCKET}/`
  const path = reference.startsWith(bucketPrefix) ? reference.slice(bucketPrefix.length) : reference
  const segments = path.split("/")

  if (
    segments.length < 2 ||
    segments[0] !== userId ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return null
  }

  return path
}

/**
 * Classify the explicit Supabase Auth update result without assuming that an
 * accepted request has already confirmed the new address.
 *
 * @param {unknown} authResult
 * @returns {"pending" | "confirmed" | "rejected"}
 */
function classifyEmailChange(authResult) {
  if (!authResult || typeof authResult !== "object" || authResult.error !== null) return "rejected"

  const user = authResult.data && typeof authResult.data === "object" ? authResult.data.user : null
  if (!user || typeof user !== "object") return "rejected"

  if (
    (typeof user.new_email === "string" && user.new_email.length > 0) ||
    (typeof user.email_change_sent_at === "string" && user.email_change_sent_at.length > 0)
  ) {
    return "pending"
  }

  return typeof user.email === "string" && user.email.length > 0 ? "confirmed" : "rejected"
}

module.exports = {
  buildAvatarObjectPath,
  buildProfileUpdate,
  classifyEmailChange,
  parseOwnedAvatarReference,
}
