const { buildProfileUpdate, classifyEmailChange } = require("./domain")
const { presentOwnProfile } = require("./avatar-presentation")

const MAX_PROFILE_BODY_BYTES = 16 * 1024
const MAX_EMAIL_BODY_BYTES = 1024
const EDITABLE_FIELDS = new Set(["first_name", "last_name", "alias", "phone"])
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * @param {unknown} input
 * @returns {{ ok: true, value: Record<string, string | null> } | { ok: false }}
 */
function validateProfileUpdateInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false }

  const entries = Object.entries(input)
  if (entries.some(([key, value]) => !EDITABLE_FIELDS.has(key) || (typeof value !== "string" && value !== null))) {
    return { ok: false }
  }

  return { ok: true, value: Object.fromEntries(entries) }
}

/**
 * @param {string} text
 * @returns {{ ok: true, value: Record<string, string | null> } | { ok: false }}
 */
function parseProfileUpdateRequestBody(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).byteLength > MAX_PROFILE_BODY_BYTES) {
    return { ok: false }
  }

  try {
    return validateProfileUpdateInput(JSON.parse(text))
  } catch {
    return { ok: false }
  }
}

/**
 * @param {unknown} input
 * @returns {{ ok: true, value: { email: string } } | { ok: false }}
 */
function validateEmailChangeInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false }

  const entries = Object.entries(input)
  if (entries.length !== 1 || entries[0][0] !== "email" || typeof entries[0][1] !== "string") {
    return { ok: false }
  }

  const email = entries[0][1].trim().toLowerCase()
  if (
    !email ||
    email.length > 254 ||
    new TextEncoder().encode(email).byteLength > 320 ||
    !EMAIL_PATTERN.test(email)
  ) {
    return { ok: false }
  }

  return { ok: true, value: { email } }
}

/**
 * @param {string} text
 * @returns {{ ok: true, value: { email: string } } | { ok: false }}
 */
function parseEmailChangeRequestBody(text) {
  if (typeof text !== "string" || new TextEncoder().encode(text).byteLength > MAX_EMAIL_BODY_BYTES) {
    return { ok: false }
  }

  try {
    return validateEmailChangeInput(JSON.parse(text))
  } catch {
    return { ok: false }
  }
}

/**
 * @param {any} supabase
 */
async function getAuthenticatedUser(supabase) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

/**
 * @param {any} supabase
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
async function getOwnProfile(supabase) {
  try {
    const user = await getAuthenticatedUser(supabase)
    if (!user) return { status: 401, body: { error: "Not authenticated" } }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    if (error) return { status: 500, body: { error: "Unable to fetch profile" } }

    const profileWithConfirmedEmail = profile && user.email
      ? { ...profile, email: user.email }
      : profile
    const presentedProfile = await presentOwnProfile(supabase, profileWithConfirmedEmail, user.id)
    return { status: 200, body: { profile: presentedProfile } }
  } catch {
    return { status: 500, body: { error: "Unable to fetch profile" } }
  }
}

/**
 * @param {any} supabase
 * @param {unknown} input
 * @param {Date} hoy
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
async function updateOwnProfile(supabase, input, hoy) {
  const validated = validateProfileUpdateInput(input)
  if (!validated.ok) return { status: 400, body: { error: "Invalid request body" } }

  try {
    const user = await getAuthenticatedUser(supabase)
    if (!user) return { status: 401, body: { error: "Not authenticated" } }

    const update = buildProfileUpdate(validated.value, hoy)
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .update(update)
      .eq("id", user.id)
      .select("*")
      .single()

    if (error) return { status: 500, body: { error: "Unable to update profile" } }
    const presentedProfile = await presentOwnProfile(supabase, profile, user.id)
    return { status: 200, body: { profile: presentedProfile } }
  } catch {
    return { status: 500, body: { error: "Unable to update profile" } }
  }
}

/**
 * Change only the authenticated identity email. Profile synchronization is
 * attempted only after Auth reports the requested address as current.
 *
 * @param {any} supabase
 * @param {unknown} input
 * @returns {Promise<{ status: number, body: Record<string, unknown> }>}
 */
async function changeOwnEmail(supabase, input) {
  const validated = validateEmailChangeInput(input)
  if (!validated.ok) {
    return {
      status: 400,
      body: {
        emailChange: {
          state: "rejected",
          code: "INVALID_REQUEST",
          message: "A valid email is required",
        },
      },
    }
  }

  try {
    const user = await getAuthenticatedUser(supabase)
    if (!user) {
      return {
        status: 401,
        body: {
          emailChange: {
            state: "rejected",
            code: "NOT_AUTHENTICATED",
            message: "Authentication is required",
          },
        },
      }
    }

    const email = validated.value.email
    const authResult = await supabase.auth.updateUser({ email })
    const state = classifyEmailChange(authResult)

    if (state === "pending") {
      return {
        status: 202,
        body: {
          emailChange: {
            state,
            code: "EMAIL_CONFIRMATION_REQUIRED",
            message: "Email change accepted; confirmation is pending",
            email,
            profileSync: "not_applicable",
          },
        },
      }
    }

    const authEmail = authResult?.data?.user?.email
    const confirmedEmail = typeof authEmail === "string" ? authEmail.trim().toLowerCase() : ""
    if (state !== "confirmed" || confirmedEmail !== email) {
      return {
        status: 422,
        body: {
          emailChange: {
            state: "rejected",
            code: "EMAIL_CHANGE_REJECTED",
            message: "Email change was rejected",
          },
        },
      }
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ email })
      .eq("id", user.id)

    if (error) {
      return {
        status: 207,
        body: {
          emailChange: {
            state: "confirmed",
            code: "EMAIL_CONFIRMED_PROFILE_SYNC_FAILED",
            message: "Email changed, but profile synchronization failed",
            email,
            profileSync: "failed",
          },
        },
      }
    }

    return {
      status: 200,
      body: {
        emailChange: {
          state: "confirmed",
          code: "EMAIL_CHANGE_CONFIRMED",
          message: "Email changed and profile synchronized",
          email,
          profileSync: "complete",
        },
      },
    }
  } catch {
    return {
      status: 500,
      body: {
        emailChange: {
          state: "rejected",
          code: "EMAIL_CHANGE_FAILED",
          message: "Unable to change email",
        },
      },
    }
  }
}

module.exports = {
  MAX_EMAIL_BODY_BYTES,
  MAX_PROFILE_BODY_BYTES,
  changeOwnEmail,
  getOwnProfile,
  parseEmailChangeRequestBody,
  parseProfileUpdateRequestBody,
  updateOwnProfile,
  validateEmailChangeInput,
  validateProfileUpdateInput,
}
