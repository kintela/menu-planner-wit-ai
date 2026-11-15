const assert = require("node:assert/strict")
const test = require("node:test")

const {
  ACTIVE_PROFILE_ROLES,
  FREEZER_ACCESS_ERRORS,
  authorizeFreezerRequest,
  getAccessibleFreezerForUser,
  normalizeMembershipRole,
  requireActiveFreezerProfile,
  resolveFreezerAccess,
  resolveFreezerSessionUserId,
} = require("../../../lib/freezer/freezer-access-logic")

const OWNER = "owner-id"
const OTHER_ADMIN = "other-admin-id"
const FREEZER = { id: "freezer-id", usuario_id: OWNER, cajones_congelador: [] }

function session({ user = null, profile = null, profileError = null } = {}) {
  return {
    auth: { async getUser() { return { data: { user }, error: null } } },
    from(table) {
      assert.equal(table, "user_profiles")
      return {
        select() { return this },
        eq() { return this },
        async maybeSingle() { return { data: profile, error: profileError } },
      }
    },
  }
}

function admin({ freezer = FREEZER, membershipsError = null } = {}) {
  return {
    from(table) {
      if (table === "congeladores_usuarios") {
        return {
          select() { return this },
          eq() { return this },
          async then(resolve) { return resolve({ data: [], error: membershipsError }) },
        }
      }
      assert.equal(table, "congeladores")
      return {
        select() { return this },
        eq() { return this },
        async maybeSingle() { return { data: freezer, error: null } },
      }
    },
  }
}

test("solo la sesión de cookies aporta identidad", async () => {
  assert.equal(await resolveFreezerSessionUserId(session({ user: { id: OWNER } })), OWNER)
  assert.equal(await resolveFreezerSessionUserId(session()), null)
})

test("el único perfil vigente admitido es admin; ausente, NULL y no-admin se deniegan", async () => {
  assert.deepEqual(ACTIVE_PROFILE_ROLES, ["admin"])
  for (const profile of [null, { role: null }, { role: "user_full" }, { role: "editor" }]) {
    assert.deepEqual(await requireActiveFreezerProfile(session({ user: { id: OWNER }, profile }), OWNER), {
      ok: false,
      reason: "profileDenied",
    })
  }
  assert.deepEqual(await requireActiveFreezerProfile(session({ user: { id: OWNER }, profile: { role: "admin" } }), OWNER), {
    ok: true,
    role: "admin",
  })
})

test("la autorización exige propietario persistido del singleton, no UUID ni rol del cliente", async () => {
  const accepted = await authorizeFreezerRequest(
    session({ user: { id: OWNER }, profile: { role: "admin" } }),
    admin(),
  )
  assert.equal(accepted.ok, true)

  for (const user of [OTHER_ADMIN, "membership-editor", "membership-viewer"]) {
    const denied = await authorizeFreezerRequest(
      session({ user: { id: user }, profile: { role: "admin" } }),
      admin(),
    )
    assert.deepEqual(denied, { ok: false, status: 404, message: FREEZER_ACCESS_ERRORS.notFound.message })
  }
})

test("anónimo recibe 401 y el admin sin singleton recibe 404 uniforme", async () => {
  assert.deepEqual(await authorizeFreezerRequest(session(), admin()), {
    ok: false,
    status: 401,
    message: FREEZER_ACCESS_ERRORS.unauthenticated.message,
  })
  assert.deepEqual(await authorizeFreezerRequest(
    session({ user: { id: OWNER }, profile: { role: "admin" } }),
    admin({ freezer: null }),
  ), { ok: false, status: 404, message: FREEZER_ACCESS_ERRORS.notFound.message })
})

test("memberships owner/editor/viewer nunca conceden acceso", async () => {
  for (const role of ["owner", "editor", "viewer"]) {
    assert.equal(normalizeMembershipRole(role, "someone-else", OWNER), null)
  }
  assert.deepEqual(await resolveFreezerAccess(admin(), "freezer-id", OTHER_ADMIN), {
    hasAccess: false,
    accessRole: null,
  })
})

test("el fallback sin tabla de sharing solo conserva la lectura del propietario persistido", async () => {
  const result = await getAccessibleFreezerForUser(admin({ membershipsError: {
    code: "42P01",
    message: 'Could not find the table "congeladores_usuarios" in schema cache',
  } }), OWNER)
  assert.equal(result.accessRole, "owner")
  assert.equal(result.freezer.id, FREEZER.id)
  assert.deepEqual(await getAccessibleFreezerForUser(admin({ freezer: FREEZER }), OTHER_ADMIN), null)
})

test("los fallos de perfil no filtran detalles internos", async () => {
  const result = await requireActiveFreezerProfile(session({
    user: { id: OWNER },
    profileError: { code: "42501", message: "permission denied" },
  }), OWNER)
  assert.deepEqual(result, { ok: false, reason: "internal" })
})
