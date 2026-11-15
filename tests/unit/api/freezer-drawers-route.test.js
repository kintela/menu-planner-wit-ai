const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const { FREEZER_ACCESS_ERRORS, handleFreezerDrawersPost } = require("../../../lib/freezer/freezer-access-logic")

const USER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"
const FREEZER_ID = "33333333-3333-4333-8333-333333333333"
const FREEZER_AJENO_ID = "44444444-4444-4444-8444-444444444444"

const MENSAJE_RANGO = "El número de cajones debe estar entre 1 y 5."
const MENSAJE_ENTERO = "El número de cajones debe ser un entero entre 1 y 5."
const MENSAJE_REDUCCION =
  "Reducir el número de cajones no está soportado: no se elimina ningún cajón ni elemento."

const SQL_INTERNAL_ERROR = {
  code: "XX000",
  message: "internal sql detail: permission denied for schema public",
  details: "detalle interno que no debe filtrarse",
  hint: null,
}

// Doble con estado compartido entre el cliente de sesión (SSR por cookies) y el
// cliente service-role local: simula congeladores, memberships y cajones con su
// inserción y lectura, sin red.
function buildFixture({
  user = USER,
  profile = { role: "admin" },
  freezers = [],
  memberships = [],
} = {}) {
  const state = {
    calls: [],
    cajones: [],
    freezers: [...freezers],
    memberships: [...memberships],
    forcedInsertError: null,
    forcedReadError: null,
  }

  const matchFilters = (row, filters) =>
    Object.entries(filters).every(([column, value]) => row[column] === value)

  const pickSelected = (row, selected) => {
    const columns = String(selected ?? "")
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean)
    const picked = {}
    columns.forEach((column) => {
      picked[column] = row[column]
    })
    return picked
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
            eq() {
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
      const call = { table, action: "select", filters: {}, payload: null, selected: null }
      const builder = {
        select(columns) {
          call.selected = columns
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
            const rows = state.freezers.filter((row) => matchFilters(row, call.filters))
            return { data: rows[0] ?? null, error: null }
          }
          if (table === "congeladores_usuarios") {
            const rows = state.memberships.filter((row) => matchFilters(row, call.filters))
            return { data: rows[0] ?? null, error: null }
          }
          if (table === "cajones_congelador") {
            if (call.action === "insert") {
              if (state.forcedInsertError) {
                return { data: null, error: state.forcedInsertError }
              }
              const filas = (Array.isArray(call.payload) ? call.payload : [call.payload]).map((fila, indice) => ({
                id: `cajon-${state.cajones.length + indice + 1}`,
                creado_en: "2026-10-26T00:00:00Z",
                ...fila,
              }))
              filas.forEach((fila) => state.cajones.push(fila))
              return {
                data: filas.map((fila) => pickSelected(fila, call.selected)),
                error: null,
              }
            }
            if (state.forcedReadError) {
              return { data: null, error: state.forcedReadError }
            }
            const rows = state.cajones.filter((row) => matchFilters(row, call.filters))
            return { data: rows.map((row) => ({ ...row })), error: null }
          }
          throw new Error(`tabla inesperada: ${table}`)
        },
      }
      return builder
    },
  }

  return { state, sessionClient, adminClient }
}

const cajon = (posicion, congeladorId = FREEZER_ID) => ({
  id: `cajon-${posicion}`,
  nombre: `Cajón ${posicion}`,
  posicion,
  descripcion: null,
  congelador_id: congeladorId,
  creado_en: "2026-10-01T10:00:00Z",
})

function freezerPropio(overrides = {}) {
  return {
    id: FREEZER_ID,
    usuario_id: USER,
    nombre: "Congelador propio",
    descripcion: null,
    ...overrides,
  }
}

function freezerAjeno() {
  return {
    id: FREEZER_AJENO_ID,
    usuario_id: OTHER,
    nombre: "Congelador compartido",
    descripcion: null,
  }
}

const membership = (rol, freezerId = FREEZER_ID, usuarioId = USER) => ({
  congelador_id: freezerId,
  usuario_id: usuarioId,
  rol,
  creado_en: "2026-10-01T10:00:00Z",
})

const llamar = (fixture, { freezerId = FREEZER_ID, totalCajones = 3 } = {}) =>
  handleFreezerDrawersPost({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient, freezerId, totalCajones })

// --- Matriz de acceso ---

test("un visitante sin sesión recibe 401 en español y no lee ni crea cajones", async () => {
  const fixture = buildFixture({ user: null })
  const outcome = await llamar(fixture)
  assert.deepEqual(outcome, {
    status: 401,
    body: { error: FREEZER_ACCESS_ERRORS.unauthenticated.message },
  })
  assert.deepEqual(fixture.state.cajones, [])
  const tocaCajones = fixture.state.calls.some((call) => call.table === "cajones_congelador")
  assert.equal(tocaCajones, false)
})

test("un usuario sin perfil vigente recibe la denegación genérica y no crea cajones", async () => {
  for (const perfil of [null, { role: null }, { role: "moderator" }]) {
    const fixture = buildFixture({ profile: perfil })
    const outcome = await llamar(fixture)
    assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.profileDenied.status)
    assert.equal(outcome.body.error, FREEZER_ACCESS_ERRORS.profileDenied.message)
    assert.deepEqual(fixture.state.cajones, [])
  }
})

test("un freezer ajeno sin acceso responde 404 uniforme sin confirmar su existencia", async () => {
  const fixture = buildFixture({ freezers: [freezerAjeno()] })
  const outcome = await llamar(fixture, { freezerId: FREEZER_AJENO_ID, totalCajones: 3 })
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(fixture.state.cajones, [])
})

test("un congelador inexistente responde 404 uniforme sin crear nada", async () => {
  const fixture = buildFixture()
  const outcome = await llamar(fixture, { freezerId: "no-existe", totalCajones: 3 })
  assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.notFound.status)
  assert.equal(outcome.body.error, FREEZER_ACCESS_ERRORS.notFound.message)
  assert.deepEqual(fixture.state.cajones, [])
})

test("una membership con rol malformado deniega con 404 uniforme sin degradar a editor", async () => {
  const fixture = buildFixture({ freezers: [freezerAjeno()], memberships: [membership("superadmin", FREEZER_AJENO_ID)] })
  const outcome = await llamar(fixture, { freezerId: FREEZER_AJENO_ID, totalCajones: 3 })
  assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.notFound.status)
  assert.deepEqual(fixture.state.cajones, [])
})

test("un viewer histórico no obtiene acceso ni crea ningún cajón", async () => {
  const fixture = buildFixture({ profile: { role: "user_full" }, freezers: [freezerAjeno()], memberships: [membership("viewer", FREEZER_AJENO_ID)] })
  fixture.state.cajones.push(cajon(1, FREEZER_AJENO_ID))
  const outcome = await llamar(fixture, { freezerId: FREEZER_AJENO_ID, totalCajones: 3 })
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.equal(fixture.state.cajones.length, 1, "sin inserciones: solo el cajón sembrado")
})

// --- Matriz de validación del objetivo (RF-5, RF-27) ---

test("seis cajones se rechazan en servidor con 400 sin crear nada", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  const outcome = await llamar(fixture, { totalCajones: 6 })
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_RANGO } })
  assert.deepEqual(fixture.state.cajones, [])
})

test("cero cajones se rechaza en servidor con 400 sin crear nada", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  const outcome = await llamar(fixture, { totalCajones: 0 })
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_RANGO } })
  assert.deepEqual(fixture.state.cajones, [])
})

test("un número no entero se rechaza en servidor con 400 sin crear nada", async () => {
  for (const objetivo of [2.5, "3", "abc", null]) {
    const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
    const outcome = await llamar(fixture, { totalCajones: objetivo })
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_ENTERO } })
    assert.deepEqual(fixture.state.cajones, [])
  }
})

test("un objetivo ausente (undefined) se rechaza en servidor con 400 sin crear nada", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  const outcome = await handleFreezerDrawersPost({
    sessionClient: fixture.sessionClient,
    adminClient: fixture.adminClient,
    freezerId: FREEZER_ID,
    totalCajones: undefined,
  })
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_ENTERO } })
  assert.deepEqual(fixture.state.cajones, [])
})

test("un freezerId ausente o vacío se rechaza con 400 sin crear nada", async () => {
  for (const freezerId of [undefined, "", "   "]) {
    const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
    const outcome = await handleFreezerDrawersPost({
      sessionClient: fixture.sessionClient,
      adminClient: fixture.adminClient,
      freezerId,
      totalCajones: 3,
    })
    assert.equal(outcome.status, 400)
    assert.deepEqual(fixture.state.cajones, [])
  }
})

// --- Igual y reducción (RF-7) ---

test("solicitar el número actual es un no-op: 200 sin inserciones ni duplicados", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  fixture.state.cajones.push(cajon(1), cajon(2))
  const outcome = await llamar(fixture, { totalCajones: 2 })
  assert.deepEqual(outcome, { status: 200, body: { drawers: [] } })
  const inserciones = fixture.state.calls.filter(
    (call) => call.table === "cajones_congelador" && call.action === "insert",
  )
  assert.deepEqual(inserciones, [])
  assert.equal(fixture.state.cajones.length, 2)
})

test("la reducción se rechaza en servidor con mensaje comprensible sin borrar ni crear nada", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  fixture.state.cajones.push(cajon(1), cajon(2), cajon(3))
  const outcome = await llamar(fixture, { totalCajones: 2 })
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_REDUCCION } })
  assert.equal(fixture.state.cajones.length, 3, "no se elimina ningún cajón")
  const inserciones = fixture.state.calls.filter(
    (call) => call.table === "cajones_congelador" && call.action === "insert",
  )
  assert.deepEqual(inserciones, [])
})

// --- Ampliación N → M con nombrado y posiciones automáticos (RF-5, RF-6) ---

test("ampliar de 2 a 5 crea exactamente 3 cajones con nombres y posiciones continuos", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  fixture.state.cajones.push(cajon(1), cajon(2))
  const outcome = await llamar(fixture, { totalCajones: 5 })
  assert.equal(outcome.status, 200)
  assert.deepEqual(outcome.body.drawers, [
    { id: "cajon-3", nombre: "Cajón 3", posicion: 3, descripcion: null, creado_en: "2026-10-26T00:00:00Z" },
    { id: "cajon-4", nombre: "Cajón 4", posicion: 4, descripcion: null, creado_en: "2026-10-26T00:00:00Z" },
    { id: "cajon-5", nombre: "Cajón 5", posicion: 5, descripcion: null, creado_en: "2026-10-26T00:00:00Z" },
  ])
  assert.equal(fixture.state.cajones.length, 5, "se crean exactamente M − N cajones")
  const insercion = fixture.state.calls.find(
    (call) => call.table === "cajones_congelador" && call.action === "insert",
  )
  assert.equal(insercion.payload.length, 3)
  assert.deepEqual(
    insercion.payload.map((fila) => ({ nombre: fila.nombre, posicion: fila.posicion, congelador_id: fila.congelador_id })),
    [
      { nombre: "Cajón 3", posicion: 3, congelador_id: FREEZER_ID },
      { nombre: "Cajón 4", posicion: 4, congelador_id: FREEZER_ID },
      { nombre: "Cajón 5", posicion: 5, congelador_id: FREEZER_ID },
    ],
  )
})

test("la ampliación continúa desde la posición máxima existente aunque haya huecos", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  fixture.state.cajones.push(cajon(1), cajon(3))
  const outcome = await llamar(fixture, { totalCajones: 4 })
  assert.equal(outcome.status, 200)
  assert.deepEqual(
    outcome.body.drawers.map((cajonCreado) => ({ nombre: cajonCreado.nombre, posicion: cajonCreado.posicion })),
    [
      { nombre: "Cajón 4", posicion: 4 },
      { nombre: "Cajón 5", posicion: 5 },
    ],
  )
})

test("el propietario histórico sin membership amplía cajones por el fallback de propietarios antiguos", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()] })
  fixture.state.cajones.push(cajon(1))
  const outcome = await llamar(fixture, { totalCajones: 2 })
  assert.equal(outcome.status, 200)
  assert.deepEqual(
    outcome.body.drawers.map((cajonCreado) => cajonCreado.nombre),
    ["Cajón 2"],
  )
  assert.equal(fixture.state.cajones.length, 2)
})

test("un editor histórico no puede ampliar cajones", async () => {
  const fixture = buildFixture({ profile: { role: "user_full" }, freezers: [freezerAjeno()], memberships: [membership("editor", FREEZER_AJENO_ID)] })
  fixture.state.cajones.push(cajon(1, FREEZER_AJENO_ID))
  const outcome = await llamar(fixture, { freezerId: FREEZER_AJENO_ID, totalCajones: 2 })
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.equal(fixture.state.cajones.length, 1)
})

// --- Errores internos sin filtrar SQL (RF-24, RF-27) ---

test("un fallo de inserción responde 500 genérico en español sin filtrar el mensaje SQL", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  fixture.state.cajones.push(cajon(1))
  fixture.state.forcedInsertError = SQL_INTERNAL_ERROR
  const outcome = await llamar(fixture, { totalCajones: 3 })
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  assert.equal(outcome.body.error.includes(SQL_INTERNAL_ERROR.message), false)
})

test("un fallo de lectura de cajones existentes responde 500 genérico sin crear nada", async () => {
  const fixture = buildFixture({ freezers: [freezerPropio()], memberships: [membership("owner")] })
  fixture.state.forcedReadError = SQL_INTERNAL_ERROR
  const outcome = await llamar(fixture, { totalCajones: 3 })
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  assert.deepEqual(fixture.state.cajones, [])
})

// --- Contratos de adaptadores ---

test("app/api/freezer/drawers/route.ts delega en el manejador puro con clientes de servidor", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/freezer/drawers/route.ts"), "utf8")
  assert.match(source, /createFreezerSessionClient/)
  assert.match(source, /createFreezerAdminClient/)
  assert.match(source, /handleFreezerDrawersPost/)
  assert.match(source, /freezerId/)
  assert.match(source, /totalCajones/)
  assert.doesNotMatch(source, /bearer|authorization/i)
  assert.doesNotMatch(source, /request\.headers/)
})

test("app/api/freezer/drawers/route.ts no filtra mensajes internos ni SQL", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/freezer/drawers/route.ts"), "utf8")
  assert.doesNotMatch(source, /error\.message/i)
  assert.doesNotMatch(source, /\(error as Error\)/)
  assert.match(source, /FREEZER_ACCESS_ERRORS\.internal/)
  assert.match(source, /force-dynamic/)
})

test("lib/freezer-access.ts reexporta el manejador del POST de cajones", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../lib/freezer-access.ts"), "utf8")
  assert.match(source, /handleFreezerDrawersPost/)
})

test("components/freezer/freezer-manager.tsx envía el contrato { freezerId, totalCajones } sin calcular cajones en cliente", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../components/freezer/freezer-manager.tsx"), "utf8")
  assert.match(source, /totalCajones/)
  assert.doesNotMatch(source, /drawers:\s*payload/)
  assert.doesNotMatch(source, /DrawerPayload/)
  assert.doesNotMatch(source, /posicion:\s*maxPosition/)
})
