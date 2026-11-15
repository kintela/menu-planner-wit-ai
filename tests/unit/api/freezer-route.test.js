const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const { FREEZER_ACCESS_ERRORS, handleFreezerGet } = require("../../../lib/freezer/freezer-access-logic")

const USER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"
const FREEZER_ID = "33333333-3333-4333-8333-333333333333"
const FREEZER_AJENO_ID = "44444444-4444-4444-8444-444444444444"

// Doble con estado compartido entre el cliente de sesión (SSR por cookies) y el
// cliente service-role local: simula congeladores, memberships y la violación
// de unicidad del índice único, sin red.
function buildFixture({ user = USER, profile = { role: "admin" } } = {}) {
  const state = {
    calls: [],
    freezers: [],
    memberships: [],
  }

  const sessionClient = {
    auth: {
      async getUser() {
        state.calls.push("auth.getUser")
        return { data: { user: user ? { id: user } : null }, error: null }
      },
    },
    from(table) {
      if (table !== "user_profiles") {
        throw new Error(`tabla inesperada: ${table}`)
      }
      return {
        select() {
          return {
            eq(column, value) {
              state.calls.push(`profile:${column}`)
              return {
                maybeSingle: async () => ({ data: profile, error: null }),
              }
            },
          }
        },
      }
    },
  }

  const adminClient = {
    from(table) {
      const call = { table, action: "select", filters: {}, payload: null }
      const builder = {
        select() {
          return builder
        },
        eq(column, value) {
          call.filters[column] = value
          return builder
        },
        insert(payload) {
          call.action = "insert"
          call.payload = payload
          return builder
        },
        upsert(payload, options) {
          call.action = "upsert"
          call.payload = payload
          call.options = options
          return builder
        },
        single() {
          return builder.execute()
        },
        maybeSingle() {
          return builder.execute()
        },
        then(onFulfilled, onRejected) {
          return builder.execute().then(onFulfilled, onRejected)
        },
        async execute() {
          state.calls.push(call)
          if (table === "congeladores") {
            if (call.action === "insert") {
              throw new Error("GET no puede insertar congeladores")
            }
            const rows = state.freezers.filter((row) =>
              Object.entries(call.filters).every(([column, value]) => row[column] === value),
            )
            const row = rows[0] ?? null
            return { data: row ? { ...row } : null, error: null }
          }
          if (table === "congeladores_usuarios") {
            if (call.action === "upsert") {
              const existing = state.memberships.find(
                (membership) =>
                  membership.congelador_id === call.payload.congelador_id &&
                  membership.usuario_id === call.payload.usuario_id,
              )
              if (existing) {
                Object.assign(existing, call.payload)
              } else {
                state.memberships.push({ creado_en: "2026-10-26T00:00:00Z", ...call.payload })
              }
              return { data: null, error: null }
            }
            const joined = state.memberships
              .filter((membership) =>
                Object.entries(call.filters).every(([column, value]) => membership[column] === value),
              )
              .map((membership) => {
                const freezer = state.freezers.find((row) => row.id === membership.congelador_id)
                if (!freezer) {
                  return null // inner join: sin congelador no hay fila
                }
                return { rol: membership.rol, creado_en: membership.creado_en, congeladores: [{ ...freezer }] }
              })
              .filter(Boolean)
            return { data: joined, error: null }
          }
          throw new Error(`tabla inesperada: ${table}`)
        },
      }
      return builder
    },
  }

  return { state, sessionClient, adminClient }
}

function ownFreezer(overrides = {}) {
  return {
    id: FREEZER_ID,
    usuario_id: USER,
    nombre: "Congelador propio",
    descripcion: null,
    cajones_congelador: [],
    ...overrides,
  }
}

function foreignFreezer() {
  return {
    id: FREEZER_AJENO_ID,
    usuario_id: OTHER,
    nombre: "Congelador compartido",
    descripcion: null,
    cajones_congelador: [],
  }
}

test("un visitante sin sesión recibe 401 en español y no obtiene datos ni congelador", async () => {
  const fixture = buildFixture({ user: null })
  const outcome = await handleFreezerGet({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient })
  assert.deepEqual(outcome, {
    status: 401,
    body: { error: FREEZER_ACCESS_ERRORS.unauthenticated.message },
  })
  assert.deepEqual(fixture.state.freezers, [])
  assert.equal(outcome.body.freezer, undefined)
})

test("un usuario sin perfil persistente recibe la denegación genérica y no se le crea congelador", async () => {
  for (const profile of [null, { role: null }, { role: "moderator" }]) {
    const fixture = buildFixture({ profile })
    const outcome = await handleFreezerGet({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient })
    assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.profileDenied.status)
    assert.equal(outcome.body.error, FREEZER_ACCESS_ERRORS.profileDenied.message)
    assert.deepEqual(fixture.state.freezers, [])
    assert.equal(outcome.body.freezer, undefined)
  }
})

test("el propietario con perfil vigente consulta su congelador con el shape preservado", async () => {
  const fixture = buildFixture()
  fixture.state.freezers.push(ownFreezer())
  fixture.state.memberships.push({ congelador_id: FREEZER_ID, usuario_id: USER, rol: "owner", creado_en: "2026-10-01T10:00:00Z" })
  const outcome = await handleFreezerGet({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient })
  assert.equal(outcome.status, 200)
  assert.deepEqual(outcome.body, {
    freezer: fixture.state.freezers[0],
    accessRole: "owner",
    isOwner: true,
  })
})

test("el propietario sin membership histórica conserva su acceso por el fallback del propietario", async () => {
  const fixture = buildFixture()
  fixture.state.freezers.push(ownFreezer())
  const outcome = await handleFreezerGet({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient })
  assert.equal(outcome.status, 200)
  assert.equal(outcome.body.accessRole, "owner")
  assert.equal(outcome.body.isOwner, true)
  assert.equal(outcome.body.freezer.id, FREEZER_ID)
})

test("las memberships editor y viewer no conceden acceso al singleton", async () => {
  for (const rol of ["editor", "viewer"]) {
    const fixture = buildFixture({ profile: { role: "user_full" } })
    fixture.state.freezers.push(foreignFreezer())
    fixture.state.memberships.push({
      congelador_id: FREEZER_AJENO_ID,
      usuario_id: USER,
      rol,
      creado_en: "2026-10-01T10:00:00Z",
    })
    const outcome = await handleFreezerGet({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient })
    assert.deepEqual(outcome, {
      status: FREEZER_ACCESS_ERRORS.profileDenied.status,
      body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message },
    })
  }
})

test("un usuario no admin no obtiene auto-creación ni membership en su primer acceso", async () => {
  const fixture = buildFixture({ profile: { role: "user_full" } })
  const outcome = await handleFreezerGet({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient })
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.profileDenied.status,
    body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message },
  })
  assert.deepEqual(fixture.state.freezers, [])
  assert.deepEqual(fixture.state.memberships, [])
})

test("el propietario admin sin singleton recibe una respuesta controlada y no se auto-crea", async () => {
  const fixture = buildFixture()
  const outcome = await handleFreezerGet({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient })
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(fixture.state.freezers, [])
  assert.equal(fixture.state.calls.some((call) => call.action === "insert"), false)
})

test("un administrador distinto del propietario no enumera el singleton", async () => {
  const fixture = buildFixture({ user: OTHER })
  fixture.state.freezers.push(ownFreezer())
  const outcome = await handleFreezerGet({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient })
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.equal(outcome.body.freezer, undefined)
})

test("app/api/freezer/route.ts resuelve la sesión solo por cookies y delega en la capa de acceso", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/freezer/route.ts"), "utf8")
  assert.match(source, /createFreezerSessionClient/)
  assert.match(source, /handleFreezerGet/)
  assert.doesNotMatch(source, /bearer|authorization/i)
  assert.doesNotMatch(source, /request\.headers/)
})

test("el cliente de sesión del congelador entiende las cookies SSR actuales de Supabase", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../lib/freezer-access.ts"), "utf8")
  assert.match(source, /@supabase\/ssr/)
  assert.doesNotMatch(source, /@supabase\/auth-helpers-nextjs/)
})

test("app/api/freezer/route.ts no filtra mensajes internos y preserva el shape de respuesta", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/freezer/route.ts"), "utf8")
  assert.doesNotMatch(source, /error\.message/i)
  assert.doesNotMatch(source, /\(error as Error\)/)
  assert.match(source, /FREEZER_ACCESS_ERRORS\.internal/)
  assert.match(source, /force-dynamic/)
})

test("el GET no contiene una operación de inserción ni crea memberships", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../lib/freezer/freezer-access-logic.js"), "utf8")
  const getSource = source.slice(source.indexOf("const handleFreezerGet"), source.indexOf("module.exports"))
  assert.doesNotMatch(getSource, /\.insert\(/)
  assert.doesNotMatch(getSource, /ensureFreezerOwnerMembership/)
})

test("lib/freezer-access.ts reexporta el manejador del GET de congeladores", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../lib/freezer-access.ts"), "utf8")
  assert.match(source, /handleFreezerGet/)
})
