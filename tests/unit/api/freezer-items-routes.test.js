const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const {
  FREEZER_ACCESS_ERRORS,
  FREEZER_BODY_MAX_BYTES,
  freezerBodyExcedeLimite,
  handleFreezerItemDelete,
  handleFreezerItemPatch,
  handleFreezerItemPost,
} = require("../../../lib/freezer/freezer-access-logic")

const USER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"
const FREEZER_ID = "33333333-3333-4333-8333-333333333333"
const FREEZER_AJENO_ID = "44444444-4444-4444-8444-444444444444"
const DRAWER_ID = "cajon-1"
const DRAWER_2_ID = "cajon-2"
const ITEM_ID = "elem-1"

const MENSAJE_PAYLOAD_INVALIDO = "Payload inválido."
const MENSAJE_FALTA_CAJON = "Falta el cajón asociado."
const MENSAJE_FALTA_ITEM_ID = "Falta el identificador del elemento."
const MENSAJE_NOMBRE_OBLIGATORIO = "El nombre del elemento es obligatorio."
const MENSAJE_NOMBRE_EDICION = "El nombre es obligatorio."
const MENSAJE_ESTADO = "El estado debe ser uno de: fresco, abierto, bajo, agotado."
const MENSAJE_CANTIDAD_NO_NEGATIVO = "La cantidad debe ser un número no negativo."
const MENSAJE_CANTIDAD_FORMATO =
  "La cantidad debe ser un número no negativo, con separador decimal , o ."
const MENSAJE_RESERVADO = "Valor inválido para reservado."
const MENSAJE_FECHA = "La fecha debe usar el formato YYYY-MM-DD."
const MENSAJE_UPDATES_INVALIDOS = "Datos de actualización inválidos."
const MENSAJE_CAJON_NO_COINCIDE = "El cajón indicado no coincide."
const MENSAJE_SIN_CAMBIOS = "No hay cambios válidos para aplicar."
const MENSAJE_CAJON_INVALIDO = "Cajón inválido."
const MENSAJE_OTRO_CONGELADOR = "El cajón de destino no pertenece al mismo congelador."

const SQL_INTERNAL_ERROR = {
  code: "XX000",
  message: "internal sql detail: permission denied for schema public",
  details: "detalle interno que no debe filtrarse",
  hint: null,
}

const capturarConsoleError = async (fn) => {
  const llamadas = []
  const original = console.error
  console.error = (...args) => llamadas.push(args)
  try {
    const resultado = await fn()
    return { resultado, llamadas }
  } finally {
    console.error = original
  }
}

// Doble con estado compartido entre el cliente de sesión (SSR por cookies) y el
// cliente service-role local: simula congeladores, memberships, cajones y
// elementos con sus operaciones, sin red.
function buildFixture({
  user = USER,
  profile = { role: "admin" },
  freezers = [freezerPropio()],
  memberships = [membership("owner")],
  drawers = [cajon(1), cajon(2)],
  items = [],
} = {}) {
  const state = {
    calls: [],
    freezers: [...freezers],
    memberships: [...memberships],
    drawers: [...drawers],
    items: [...items],
    forced: {
      "elementos_cajon:select": null,
      "elementos_cajon:insert": null,
      "elementos_cajon:update": null,
      "elementos_cajon:delete": null,
      "cajones_congelador:select": null,
    },
    // Simulan una operación sin error que no recupera ninguna fila (p. ej. la
    // fila desapareció entre la lectura y la escritura).
    insertDataNula: false,
    updateDataNula: false,
  }

  const matchFilters = (row, filters) =>
    Object.entries(filters).every(([column, value]) => row[column] === value)

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

  const manejarCajones = (call) => {
    const rows = state.drawers.filter((row) => matchFilters(row, call.filters))
    return { data: rows[0] ? { ...rows[0] } : null, error: null }
  }

  const manejarElementos = (call) => {
    if (call.action === "select") {
      const rows = state.items.filter((row) => matchFilters(row, call.filters))
      return { data: rows[0] ? { ...rows[0] } : null, error: null }
    }
    if (call.action === "insert") {
      if (state.insertDataNula) {
        return { data: null, error: null }
      }
      const filas = (Array.isArray(call.payload) ? call.payload : [call.payload]).map((fila, indice) => ({
        id: `elem-${state.items.length + indice + 1}`,
        cantidad: null,
        unidad: null,
        categoria: null,
        fecha_compra: null,
        fecha_congelacion: null,
        fecha_caducidad: null,
        notas: null,
        reservado: false,
        imagen_url: null,
        creado_en: "2026-10-26T00:00:00Z",
        actualizado_en: "2026-10-26T00:00:00Z",
        ...fila,
      }))
      filas.forEach((fila) => state.items.push(fila))
      return { data: filas[0] ? { ...filas[0] } : null, error: null }
    }
    if (call.action === "update") {
      if (state.updateDataNula) {
        return { data: null, error: null }
      }
      const matched = state.items.filter((row) => matchFilters(row, call.filters))
      matched.forEach((row) => Object.assign(row, call.payload))
      return { data: matched[0] ? { ...matched[0] } : null, error: null }
    }
    if (call.action === "delete") {
      state.items = state.items.filter((row) => !matchFilters(row, call.filters))
      return { data: null, error: null }
    }
    throw new Error(`acción inesperada: ${call.action}`)
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
        update(payload) {
          call.action = "update"
          call.payload = payload
          return builder
        },
        delete() {
          call.action = "delete"
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
          const forced = state.forced[`${table}:${call.action}`]
          if (forced) {
            return { data: null, error: forced }
          }
          if (table === "elementos_cajon") return manejarElementos(call)
          if (table === "cajones_congelador") return manejarCajones(call)
          if (table === "congeladores") {
            const rows = state.freezers.filter((row) => matchFilters(row, call.filters))
            return { data: rows[0] ?? null, error: null }
          }
          if (table === "congeladores_usuarios") {
            const rows = state.memberships.filter((row) => matchFilters(row, call.filters))
            return { data: rows[0] ?? null, error: null }
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

const elemento = (overrides = {}) => ({
  id: ITEM_ID,
  cajon_id: DRAWER_ID,
  nombre: "Filete de ternera",
  cantidad: 1.5,
  unidad: "kg",
  estado: "fresco",
  categoria: null,
  fecha_compra: "2026-10-01",
  fecha_congelacion: "2026-10-01",
  fecha_caducidad: "2027-10-01",
  notas: null,
  reservado: false,
  imagen_url: null,
  creado_en: "2026-10-01T10:00:00Z",
  actualizado_en: "2026-10-01T10:00:00Z",
  cajones_congelador: { id: DRAWER_ID, congelador_id: FREEZER_ID },
  ...overrides,
})

const llamarPost = (fixture, body) =>
  handleFreezerItemPost({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient, body })

const llamarPatch = (fixture, itemId, body) =>
  handleFreezerItemPatch({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient, itemId, body })

const llamarDelete = (fixture, itemId) =>
  handleFreezerItemDelete({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient, itemId })

const insercionesElementos = (fixture) =>
  fixture.state.calls.filter((call) => call.table === "elementos_cajon" && call.action === "insert")

const actualizacionesElementos = (fixture) =>
  fixture.state.calls.filter((call) => call.table === "elementos_cajon" && call.action === "update")

const borradosElementos = (fixture) =>
  fixture.state.calls.filter((call) => call.table === "elementos_cajon" && call.action === "delete")

const payloadAltaValido = (overrides = {}) => ({
  cajon_id: DRAWER_ID,
  nombre: "Filete de ternera",
  estado: "fresco",
  ...overrides,
})

// --- Límite de tamaño del cuerpo (RF-24, RF-27) ---

test("freezerBodyExcedeLimite mide bytes UTF-8 contra el límite del cuerpo", () => {
  assert.equal(typeof FREEZER_BODY_MAX_BYTES, "number")
  assert.ok(FREEZER_BODY_MAX_BYTES > 0)
  assert.equal(freezerBodyExcedeLimite("x".repeat(FREEZER_BODY_MAX_BYTES)), false)
  assert.equal(freezerBodyExcedeLimite("x".repeat(FREEZER_BODY_MAX_BYTES + 1)), true)
  assert.equal(freezerBodyExcedeLimite("ñ".repeat(FREEZER_BODY_MAX_BYTES / 2)), false)
  assert.equal(freezerBodyExcedeLimite("ñ".repeat(FREEZER_BODY_MAX_BYTES / 2 + 1)), true)
  assert.equal(freezerBodyExcedeLimite(null), false)
})

// --- POST /api/freezer/items: matriz de acceso ---

test("un visitante sin sesión recibe 401 en español y no lee ni crea elementos", async () => {
  const fixture = buildFixture({ user: null })
  const outcome = await llamarPost(fixture, payloadAltaValido())
  assert.deepEqual(outcome, {
    status: 401,
    body: { error: FREEZER_ACCESS_ERRORS.unauthenticated.message },
  })
  assert.deepEqual(insercionesElementos(fixture), [])
  assert.deepEqual(fixture.state.items, [])
})

test("el alta verifica primero el singleton del propietario admin antes de leer el cajón", async () => {
  const fixture = buildFixture({ freezers: [] })
  const outcome = await llamarPost(fixture, payloadAltaValido())

  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  const firstDatabaseCall = fixture.state.calls.find((call) => call && typeof call === "object")
  assert.equal(firstDatabaseCall.table, "congeladores")
  assert.equal(fixture.state.calls.some((call) => call.table === "elementos_cajon" && call.action === "insert"), false)
})

test("un usuario sin perfil vigente recibe la denegación genérica y no crea elementos", async () => {
  for (const perfil of [null, { role: null }, { role: "moderator" }]) {
    const fixture = buildFixture({ profile: perfil })
    const outcome = await llamarPost(fixture, payloadAltaValido())
    assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.profileDenied.status)
    assert.equal(outcome.body.error, FREEZER_ACCESS_ERRORS.profileDenied.message)
    assert.deepEqual(insercionesElementos(fixture), [])
  }
})

test("un cajón de un congelador ajeno responde 404 uniforme sin revelar su existencia", async () => {
  const fixture = buildFixture({
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("owner")],
    drawers: [cajon(1), cajon(9, FREEZER_AJENO_ID)],
  })
  const outcome = await llamarPost(fixture, payloadAltaValido({ cajon_id: "cajon-9" }))
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(insercionesElementos(fixture), [])
})

test("un cajón inexistente responde 404 uniforme sin crear nada", async () => {
  const fixture = buildFixture()
  const outcome = await llamarPost(fixture, payloadAltaValido({ cajon_id: "cajon-fantasma" }))
  assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.notFound.status)
  assert.equal(outcome.body.error, FREEZER_ACCESS_ERRORS.notFound.message)
  assert.deepEqual(insercionesElementos(fixture), [])
})

test("un viewer histórico no obtiene acceso ni crea ningún elemento", async () => {
  const fixture = buildFixture({ profile: { role: "user_full" }, memberships: [membership("viewer")] })
  const outcome = await llamarPost(fixture, payloadAltaValido())
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.deepEqual(insercionesElementos(fixture), [])
})

test("una membership con rol malformado deniega con 404 uniforme sin degradar a editor", async () => {
  const fixture = buildFixture({
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("owner"), membership("superadmin", FREEZER_AJENO_ID)],
    drawers: [cajon(1), cajon(9, FREEZER_AJENO_ID)],
  })
  const outcome = await llamarPost(fixture, payloadAltaValido({ cajon_id: "cajon-9" }))
  assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.notFound.status)
  assert.deepEqual(insercionesElementos(fixture), [])
})

test("el propietario histórico sin membership crea elementos por el fallback de propietarios antiguos", async () => {
  const fixture = buildFixture({ memberships: [] })
  const outcome = await llamarPost(fixture, payloadAltaValido())
  assert.equal(outcome.status, 200)
  assert.equal(outcome.body.item.cajon_id, DRAWER_ID)
})

test("un editor histórico no puede añadir elementos en un congelador compartido", async () => {
  const fixture = buildFixture({
    profile: { role: "user_full" },
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("editor", FREEZER_AJENO_ID)],
    drawers: [cajon(9, FREEZER_AJENO_ID)],
  })
  const outcome = await llamarPost(fixture, payloadAltaValido({ cajon_id: "cajon-9" }))
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.deepEqual(insercionesElementos(fixture), [])
})

// --- POST: validación estricta con el dominio (RF-8–RF-11, RF-27) ---

test("un payload no objeto se rechaza con 400 sin tocar datos", async () => {
  for (const body of [null, "texto", 42, [payloadAltaValido()]]) {
    const fixture = buildFixture()
    const outcome = await llamarPost(fixture, body)
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_PAYLOAD_INVALIDO } })
    assert.deepEqual(fixture.state.items, [])
  }
})

test("un alta sin cajón asociado se rechaza con 400 sin tocar datos", async () => {
  for (const cajon_id of [undefined, "", "   ", 5]) {
    const fixture = buildFixture()
    const outcome = await llamarPost(fixture, payloadAltaValido({ cajon_id }))
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_FALTA_CAJON } })
    assert.deepEqual(fixture.state.items, [])
  }
})

test("un alta sin nombre (trim vacío o no texto) se rechaza con 400 sin tocar datos", async () => {
  for (const nombre of [undefined, "", "   ", 5]) {
    const fixture = buildFixture()
    const outcome = await llamarPost(fixture, payloadAltaValido({ nombre }))
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_NOMBRE_OBLIGATORIO } })
    assert.deepEqual(fixture.state.items, [])
  }
})

test("un estado fuera del catálogo se rechaza en servidor con 400 sin alterar datos", async () => {
  for (const estado of ["manipulado", "", "FRESCO", undefined, 5]) {
    const fixture = buildFixture()
    const outcome = await llamarPost(fixture, payloadAltaValido({ estado }))
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_ESTADO } })
    assert.deepEqual(fixture.state.items, [])
  }
})

test("una cantidad negativa o no numérica se rechaza en servidor con 400 sin alterar datos", async () => {
  const casos = [
    { cantidad: -1, mensaje: MENSAJE_CANTIDAD_NO_NEGATIVO },
    { cantidad: -0.5, mensaje: MENSAJE_CANTIDAD_NO_NEGATIVO },
    { cantidad: "-2", mensaje: MENSAJE_CANTIDAD_FORMATO },
    { cantidad: "abc", mensaje: MENSAJE_CANTIDAD_FORMATO },
    { cantidad: true, mensaje: MENSAJE_CANTIDAD_FORMATO },
  ]
  for (const caso of casos) {
    const fixture = buildFixture()
    const outcome = await llamarPost(fixture, payloadAltaValido(caso))
    assert.deepEqual(outcome, { status: 400, body: { error: caso.mensaje } })
    assert.deepEqual(fixture.state.items, [])
  }
})

test("la cantidad acepta ausencia, nulo, cero, enteros y decimales con coma o punto", async () => {
  const casos = [
    { enviado: undefined, esperado: "ausente" },
    { enviado: null, esperado: null },
    { enviado: 0, esperado: 0 },
    { enviado: "0", esperado: 0 },
    { enviado: "0,5", esperado: 0.5 },
    { enviado: 2.5, esperado: 2.5 },
    { enviado: "3", esperado: 3 },
  ]
  for (const caso of casos) {
    const fixture = buildFixture()
    const overrides = caso.enviado === undefined ? {} : { cantidad: caso.enviado }
    const outcome = await llamarPost(fixture, payloadAltaValido(overrides))
    assert.equal(outcome.status, 200)
    if (caso.esperado === "ausente") {
      assert.equal("cantidad" in insercionesElementos(fixture)[0].payload, false)
    } else {
      assert.deepEqual(insercionesElementos(fixture)[0].payload.cantidad, caso.esperado)
    }
  }
})

test("los campos opcionales de texto aceptan string recortado o nulo y rechazan otros tipos", async () => {
  for (const campo of ["unidad", "categoria", "notas"]) {
    const fixtureRechazo = buildFixture()
    const outcomeRechazo = await llamarPost(fixtureRechazo, payloadAltaValido({ [campo]: 5 }))
    assert.deepEqual(outcomeRechazo, { status: 400, body: { error: `Valor inválido para ${campo}.` } })

    const fixtureNulo = buildFixture()
    const outcomeNulo = await llamarPost(fixtureNulo, payloadAltaValido({ [campo]: null }))
    assert.equal(outcomeNulo.status, 200)
    assert.equal(insercionesElementos(fixtureNulo)[0].payload[campo], null)

    const fixtureTrim = buildFixture()
    const outcomeTrim = await llamarPost(fixtureTrim, payloadAltaValido({ [campo]: " kg " }))
    assert.equal(outcomeTrim.status, 200)
    assert.equal(insercionesElementos(fixtureTrim)[0].payload[campo], "kg")

    const fixtureVacio = buildFixture()
    const outcomeVacio = await llamarPost(fixtureVacio, payloadAltaValido({ [campo]: "   " }))
    assert.equal(outcomeVacio.status, 200)
    assert.equal(insercionesElementos(fixtureVacio)[0].payload[campo], null)
  }
})

test("las fechas opcionales deben ser ISO YYYY-MM-DD si están presentes", async () => {
  for (const campo of ["fecha_compra", "fecha_congelacion", "fecha_caducidad"]) {
    const fixtureFormato = buildFixture()
    const outcomeFormato = await llamarPost(fixtureFormato, payloadAltaValido({ [campo]: "26/10/2026" }))
    assert.deepEqual(outcomeFormato, { status: 400, body: { error: MENSAJE_FECHA } })

    const fixtureCivil = buildFixture()
    const outcomeCivil = await llamarPost(fixtureCivil, payloadAltaValido({ [campo]: "2026-02-30" }))
    assert.deepEqual(outcomeCivil, { status: 400, body: { error: MENSAJE_FECHA } })

    const fixtureNulo = buildFixture()
    const outcomeNulo = await llamarPost(fixtureNulo, payloadAltaValido({ [campo]: null }))
    assert.equal(outcomeNulo.status, 200)
    assert.equal(insercionesElementos(fixtureNulo)[0].payload[campo], null)

    const fixtureVacio = buildFixture()
    const outcomeVacio = await llamarPost(fixtureVacio, payloadAltaValido({ [campo]: "" }))
    assert.equal(outcomeVacio.status, 200)
    assert.equal(insercionesElementos(fixtureVacio)[0].payload[campo], null)

    const fixtureValida = buildFixture()
    const outcomeValida = await llamarPost(fixtureValida, payloadAltaValido({ [campo]: "2026-10-26" }))
    assert.equal(outcomeValida.status, 200)
    assert.equal(insercionesElementos(fixtureValida)[0].payload[campo], "2026-10-26")
  }
})

test("no se impone orden cronológico entre las fechas del elemento", async () => {
  const fixture = buildFixture()
  const outcome = await llamarPost(
    fixture,
    payloadAltaValido({ fecha_compra: "2026-10-01", fecha_caducidad: "2025-01-01" }),
  )
  assert.equal(outcome.status, 200)
})

test("la reserva acepta solo booleano", async () => {
  const fixtureRechazo = buildFixture()
  const outcomeRechazo = await llamarPost(fixtureRechazo, payloadAltaValido({ reservado: "sí" }))
  assert.deepEqual(outcomeRechazo, { status: 400, body: { error: MENSAJE_RESERVADO } })

  const fixtureAlta = buildFixture()
  const outcomeAlta = await llamarPost(fixtureAlta, payloadAltaValido({ reservado: true }))
  assert.equal(outcomeAlta.status, 200)
  assert.equal(insercionesElementos(fixtureAlta)[0].payload.reservado, true)
})

test("el cuerpo se procesa con allowlist: los campos desconocidos se ignoran y nunca llegan a la base de datos", async () => {
  const fixture = buildFixture()
  const outcome = await llamarPost(
    fixture,
    payloadAltaValido({ usuario_id: OTHER, imagen_url: "https://atacante.example/imagen.png", creado_en: "1999-01-01" }),
  )
  assert.equal(outcome.status, 200)
  const payload = insercionesElementos(fixture)[0].payload
  assert.equal("usuario_id" in payload, false)
  assert.equal("imagen_url" in payload, false)
  assert.equal("creado_en" in payload, false)
})

test("el nombre y el cajón del alta se recortan con trim", async () => {
  const fixture = buildFixture()
  const outcome = await llamarPost(fixture, payloadAltaValido({ cajon_id: " cajon-1 ", nombre: "  Filete  " }))
  assert.equal(outcome.status, 200)
  const payload = insercionesElementos(fixture)[0].payload
  assert.equal(payload.nombre, "Filete")
  assert.equal(payload.cajon_id, "cajon-1")
})

// --- POST: éxito y errores internos ---

test("el alta con el mínimo de campos crea el elemento con valores por defecto de la base de datos", async () => {
  const fixture = buildFixture()
  const outcome = await llamarPost(fixture, { cajon_id: DRAWER_ID, nombre: "Guiso", estado: "agotado" })
  assert.equal(outcome.status, 200)
  assert.deepEqual(Object.keys(insercionesElementos(fixture)[0].payload), ["cajon_id", "nombre", "estado"])
  assert.equal(outcome.body.item.nombre, "Guiso")
  assert.equal(outcome.body.item.cajon_id, DRAWER_ID)
  assert.equal(outcome.body.item.estado, "agotado")
})

test("un fallo de inserción responde 500 genérico en español sin filtrar el mensaje SQL", async () => {
  const fixture = buildFixture()
  fixture.state.forced["elementos_cajon:insert"] = SQL_INTERNAL_ERROR
  const { resultado: outcome, llamadas } = await capturarConsoleError(() => llamarPost(fixture, payloadAltaValido()))
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  const registro = llamadas.flat().join(" ")
  assert.equal(registro.includes(SQL_INTERNAL_ERROR.message), false)
  assert.equal(fixture.state.items.length, 0)
})

test("un fallo al leer el cajón responde 500 genérico sin crear nada", async () => {
  const fixture = buildFixture()
  fixture.state.forced["cajones_congelador:select"] = SQL_INTERNAL_ERROR
  const { resultado: outcome, llamadas } = await capturarConsoleError(() => llamarPost(fixture, payloadAltaValido()))
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  const registro = llamadas.flat().join(" ")
  assert.equal(registro.includes(SQL_INTERNAL_ERROR.message), false)
  assert.deepEqual(insercionesElementos(fixture), [])
})

test("una inserción sin fila recuperada responde 500 genérico", async () => {
  const fixture = buildFixture()
  fixture.state.insertDataNula = true
  const outcome = await llamarPost(fixture, payloadAltaValido())
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
})

// --- PATCH /api/freezer/items/[itemId]: estructura y acceso ---

test("un PATCH sin identificador de elemento se rechaza con 400", async () => {
  const fixture = buildFixture()
  const outcome = await llamarPatch(fixture, "", { drawerId: DRAWER_ID, updates: { nombre: "Nuevo" } })
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_FALTA_ITEM_ID } })
})

test("un PATCH con payload no objeto se rechaza con 400", async () => {
  for (const body of [null, "texto", 42]) {
    const fixture = buildFixture()
    const outcome = await llamarPatch(fixture, ITEM_ID, body)
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_PAYLOAD_INVALIDO } })
  }
})

test("un PATCH sin cajón asociado se rechaza con 400 sin tocar datos", async () => {
  for (const drawerId of [undefined, "", "   "]) {
    const fixture = buildFixture({ items: [elemento()] })
    const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId, updates: { nombre: "Nuevo" } })
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_FALTA_CAJON } })
    assert.deepEqual(actualizacionesElementos(fixture), [])
  }
})

test("un PATCH con updates no objeto se rechaza con 400 sin tocar datos", async () => {
  for (const updates of [null, "texto", 42, [{ nombre: "Nuevo" }]]) {
    const fixture = buildFixture({ items: [elemento()] })
    const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates })
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_UPDATES_INVALIDOS } })
    assert.deepEqual(actualizacionesElementos(fixture), [])
  }
})

test("un PATCH anónimo o sin perfil vigente no toca ningún dato", async () => {
  const fixtureAnonimo = buildFixture({ user: null, items: [elemento()] })
  const outcomeAnonimo = await llamarPatch(fixtureAnonimo, ITEM_ID, { drawerId: DRAWER_ID, updates: { nombre: "Nuevo" } })
  assert.deepEqual(outcomeAnonimo, {
    status: 401,
    body: { error: FREEZER_ACCESS_ERRORS.unauthenticated.message },
  })
  assert.deepEqual(actualizacionesElementos(fixtureAnonimo), [])

  const fixtureSinPerfil = buildFixture({ profile: { role: "moderator" }, items: [elemento()] })
  const outcomeSinPerfil = await llamarPatch(fixtureSinPerfil, ITEM_ID, { drawerId: DRAWER_ID, updates: { nombre: "Nuevo" } })
  assert.equal(outcomeSinPerfil.status, FREEZER_ACCESS_ERRORS.profileDenied.status)
  assert.deepEqual(actualizacionesElementos(fixtureSinPerfil), [])
})

test("un PATCH de elemento inexistente responde 404 uniforme sin confirmar existencia", async () => {
  const fixture = buildFixture()
  const outcome = await llamarPatch(fixture, "elem-fantasma", { drawerId: DRAWER_ID, updates: { nombre: "Nuevo" } })
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(actualizacionesElementos(fixture), [])
})

test("un PATCH de elemento ajeno responde 404 uniforme antes de revelar contenido", async () => {
  const fixture = buildFixture({
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("owner")],
    drawers: [cajon(1), cajon(9, FREEZER_AJENO_ID)],
    items: [elemento({ cajon_id: "cajon-9", cajones_congelador: { id: "cajon-9", congelador_id: FREEZER_AJENO_ID } })],
  })
  const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: "cajon-9", updates: { nombre: "Nuevo" } })
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(actualizacionesElementos(fixture), [])
  assert.equal(fixture.state.items[0].nombre, "Filete de ternera")
})

test("un viewer histórico no obtiene acceso en PATCH ni toca datos", async () => {
  const fixture = buildFixture({ profile: { role: "user_full" }, memberships: [membership("viewer")], items: [elemento()] })
  const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { nombre: "Nuevo" } })
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.deepEqual(actualizacionesElementos(fixture), [])
})

test("un PATCH cuyo cajón no coincide con el del elemento se rechaza con 400", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_2_ID, updates: { nombre: "Nuevo" } })
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_CAJON_NO_COINCIDE } })
  assert.deepEqual(actualizacionesElementos(fixture), [])
})

// --- PATCH: validación estricta de campos presentes ---

test("un nombre vacío o no texto en updates se rechaza con 400 sin tocar datos", async () => {
  for (const nombre of ["", "   ", 5]) {
    const fixture = buildFixture({ items: [elemento()] })
    const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { nombre } })
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_NOMBRE_EDICION } })
    assert.deepEqual(actualizacionesElementos(fixture), [])
  }
})

test("un estado manipulado en updates se rechaza con 400 sin tocar datos", async () => {
  for (const estado of ["manipulado", "", undefined]) {
    const fixture = buildFixture({ items: [elemento()] })
    const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { estado } })
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_ESTADO } })
    assert.deepEqual(actualizacionesElementos(fixture), [])
  }
})

test("una cantidad negativa o no numérica en updates se rechaza con 400 sin tocar datos", async () => {
  const casos = [
    { cantidad: -3, mensaje: MENSAJE_CANTIDAD_NO_NEGATIVO },
    { cantidad: "-3", mensaje: MENSAJE_CANTIDAD_FORMATO },
    { cantidad: "abc", mensaje: MENSAJE_CANTIDAD_FORMATO },
  ]
  for (const caso of casos) {
    const fixture = buildFixture({ items: [elemento()] })
    const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: caso })
    assert.deepEqual(outcome, { status: 400, body: { error: caso.mensaje } })
    assert.deepEqual(actualizacionesElementos(fixture), [])
  }
})

test("la cantidad en updates acepta nulo, cero y decimal con coma", async () => {
  const casos = [
    { enviado: null, esperado: null },
    { enviado: 0, esperado: 0 },
    { enviado: "1,5", esperado: 1.5 },
  ]
  for (const caso of casos) {
    const fixture = buildFixture({ items: [elemento()] })
    const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { cantidad: caso.enviado } })
    assert.equal(outcome.status, 200)
    assert.deepEqual(outcome.body.item.cantidad, caso.esperado)
  }
})

test("los campos opcionales de texto y las fechas en updates siguen la misma validación tipada", async () => {
  const fixtureUnidad = buildFixture({ items: [elemento()] })
  const outcomeUnidad = await llamarPatch(fixtureUnidad, ITEM_ID, { drawerId: DRAWER_ID, updates: { unidad: 5 } })
  assert.deepEqual(outcomeUnidad, { status: 400, body: { error: "Valor inválido para unidad." } })

  const fixtureFecha = buildFixture({ items: [elemento()] })
  const outcomeFecha = await llamarPatch(fixtureFecha, ITEM_ID, {
    drawerId: DRAWER_ID,
    updates: { fecha_caducidad: "2026-13-01" },
  })
  assert.deepEqual(outcomeFecha, { status: 400, body: { error: MENSAJE_FECHA } })
})

test("la reserva en updates acepta solo booleano", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { reservado: "true" } })
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_RESERVADO } })
  assert.deepEqual(actualizacionesElementos(fixture), [])
})

test("un PATCH sin campos válidos se rechaza con 400", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: {} })
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_SIN_CAMBIOS } })
})

// --- PATCH: movimiento entre cajones (RF-8, RF-27) ---

test("el movimiento dentro del mismo congelador actualiza el cajón del elemento", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { cajon_id: DRAWER_2_ID } })
  assert.equal(outcome.status, 200)
  assert.equal(outcome.body.item.cajon_id, DRAWER_2_ID)
  assert.equal(fixture.state.items[0].cajon_id, DRAWER_2_ID)
})

test("el movimiento a un cajón de otro congelador no accesible responde 404 sin cambios parciales", async () => {
  const fixture = buildFixture({
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("owner"), membership("editor", FREEZER_AJENO_ID)],
    drawers: [cajon(1), cajon(2), cajon(9, FREEZER_AJENO_ID)],
    items: [elemento({ reservado: true, nombre: "Filete de ternera" })],
  })
  const outcome = await llamarPatch(fixture, ITEM_ID, {
    drawerId: DRAWER_ID,
    updates: { nombre: "Cambiado", cajon_id: "cajon-9" },
  })
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.notFound.status, body: { error: FREEZER_ACCESS_ERRORS.notFound.message } })
  assert.deepEqual(actualizacionesElementos(fixture), [], "no se aplica ninguna actualización parcial")
  assert.equal(fixture.state.items[0].cajon_id, DRAWER_ID)
  assert.equal(fixture.state.items[0].nombre, "Filete de ternera")
  assert.equal(fixture.state.items[0].reservado, true)
})

test("el movimiento a un cajón de un congelador sin acceso responde 404 uniforme sin cambios parciales", async () => {
  const fixture = buildFixture({
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("owner")],
    drawers: [cajon(1), cajon(2), cajon(9, FREEZER_AJENO_ID)],
    items: [elemento()],
  })
  const outcome = await llamarPatch(fixture, ITEM_ID, {
    drawerId: DRAWER_ID,
    updates: { nombre: "Cambiado", cajon_id: "cajon-9" },
  })
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(actualizacionesElementos(fixture), [])
  assert.equal(fixture.state.items[0].nombre, "Filete de ternera")
  assert.equal(fixture.state.items[0].cajon_id, DRAWER_ID)
})

test("el movimiento a un cajón inexistente responde 404 uniforme sin cambios parciales", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const outcome = await llamarPatch(fixture, ITEM_ID, {
    drawerId: DRAWER_ID,
    updates: { nombre: "Cambiado", cajon_id: "cajon-fantasma" },
  })
  assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.notFound.status)
  assert.deepEqual(actualizacionesElementos(fixture), [])
  assert.equal(fixture.state.items[0].nombre, "Filete de ternera")
})

test("un cajón de destino inválido se rechaza con 400 sin cambios parciales", async () => {
  for (const cajon_id of [undefined, "", "   ", 5]) {
    const fixture = buildFixture({ items: [elemento()] })
    const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { cajon_id } })
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_CAJON_INVALIDO } })
    assert.deepEqual(actualizacionesElementos(fixture), [])
  }
})

// --- PATCH: reserva informativa reversible (RF-14, RF-15) ---

test("la reserva es un booleano reversible: marcar y liberar funcionan", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const marcado = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { reservado: true } })
  assert.equal(marcado.status, 200)
  assert.equal(marcado.body.item.reservado, true)

  const liberado = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { reservado: false } })
  assert.equal(liberado.status, 200)
  assert.equal(liberado.body.item.reservado, false)
})

test("la reserva no bloquea ninguna acción: editar, mover y borrar funcionan sobre un reservado", async () => {
  const fixture = buildFixture({ items: [elemento({ reservado: true })] })

  const editado = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { nombre: "Renombrado" } })
  assert.equal(editado.status, 200)
  assert.equal(fixture.state.items[0].reservado, true, "la edición conserva la reserva")

  const movido = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { cajon_id: DRAWER_2_ID } })
  assert.equal(movido.status, 200)
  assert.equal(fixture.state.items[0].reservado, true, "el movimiento conserva la reserva")

  const borrado = await llamarDelete(fixture, ITEM_ID)
  assert.equal(borrado.status, 200)
  assert.deepEqual(fixture.state.items, [], "el elemento reservado se elimina definitivamente")
})

// --- PATCH: éxito, carrus de relectura y errores internos ---

test("la edición devuelve el shape { item } con los campos del elemento", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const outcome = await llamarPatch(fixture, ITEM_ID, {
    drawerId: DRAWER_ID,
    updates: { nombre: "Solomillo", cantidad: "0,5", notas: " Cortado en filetes " },
  })
  assert.equal(outcome.status, 200)
  assert.equal(outcome.body.item.nombre, "Solomillo")
  assert.deepEqual(outcome.body.item.cantidad, 0.5)
  assert.equal(outcome.body.item.notas, "Cortado en filetes")
  assert.equal(outcome.body.item.cajon_id, DRAWER_ID)
})

test("un PATCH que tras la carrera no recupera el elemento actualizado responde 404 uniforme", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  // Simula que entre la lectura y la actualización el elemento desapareció:
  // la actualización no da error pero tampoco devuelve ninguna fila.
  fixture.state.updateDataNula = true
  const outcome = await llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { nombre: "Nuevo" } })
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
})

test("un fallo de actualización responde 500 genérico sin filtrar el mensaje SQL y sin alterar datos", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  fixture.state.forced["elementos_cajon:update"] = SQL_INTERNAL_ERROR
  const { resultado: outcome, llamadas } = await capturarConsoleError(() =>
    llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { nombre: "Nuevo" } }),
  )
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  const registro = llamadas.flat().join(" ")
  assert.equal(registro.includes(SQL_INTERNAL_ERROR.message), false)
  assert.equal(fixture.state.items[0].nombre, "Filete de ternera")
})

test("un fallo al leer el elemento responde 500 genérico sin filtrar el mensaje SQL", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  fixture.state.forced["elementos_cajon:select"] = SQL_INTERNAL_ERROR
  const { resultado: outcome, llamadas } = await capturarConsoleError(() =>
    llamarPatch(fixture, ITEM_ID, { drawerId: DRAWER_ID, updates: { nombre: "Nuevo" } }),
  )
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  const registro = llamadas.flat().join(" ")
  assert.equal(registro.includes(SQL_INTERNAL_ERROR.message), false)
})

// --- DELETE /api/freezer/items/[itemId] ---

test("un DELETE sin identificador de elemento se rechaza con 400", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const outcome = await llamarDelete(fixture, "")
  assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_FALTA_ITEM_ID } })
})

test("un DELETE anónimo o sin perfil vigente no toca ningún dato", async () => {
  const fixtureAnonimo = buildFixture({ user: null, items: [elemento()] })
  const outcomeAnonimo = await llamarDelete(fixtureAnonimo, ITEM_ID)
  assert.deepEqual(outcomeAnonimo, {
    status: 401,
    body: { error: FREEZER_ACCESS_ERRORS.unauthenticated.message },
  })
  assert.deepEqual(borradosElementos(fixtureAnonimo), [])
  assert.equal(fixtureAnonimo.state.items.length, 1)

  const fixtureSinPerfil = buildFixture({ profile: { role: null }, items: [elemento()] })
  const outcomeSinPerfil = await llamarDelete(fixtureSinPerfil, ITEM_ID)
  assert.equal(outcomeSinPerfil.status, FREEZER_ACCESS_ERRORS.profileDenied.status)
  assert.deepEqual(borradosElementos(fixtureSinPerfil), [])
  assert.equal(fixtureSinPerfil.state.items.length, 1)
})

test("un DELETE de elemento inexistente responde 404 uniforme sin confirmar existencia", async () => {
  const fixture = buildFixture()
  const outcome = await llamarDelete(fixture, "elem-fantasma")
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(borradosElementos(fixture), [])
})

test("un DELETE de elemento ajeno responde 404 uniforme antes de revelar contenido", async () => {
  const fixture = buildFixture({
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("owner")],
    drawers: [cajon(1), cajon(9, FREEZER_AJENO_ID)],
    items: [elemento({ cajon_id: "cajon-9", cajones_congelador: { id: "cajon-9", congelador_id: FREEZER_AJENO_ID } })],
  })
  const outcome = await llamarDelete(fixture, ITEM_ID)
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(borradosElementos(fixture), [])
  assert.equal(fixture.state.items.length, 1, "el elemento ajeno no se elimina")
})

test("un viewer histórico no obtiene acceso en DELETE ni borra datos", async () => {
  const fixture = buildFixture({ profile: { role: "user_full" }, memberships: [membership("viewer")], items: [elemento()] })
  const outcome = await llamarDelete(fixture, ITEM_ID)
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.deepEqual(borradosElementos(fixture), [])
  assert.equal(fixture.state.items.length, 1)
})

test("el borrado individual es definitivo e incluye elementos reservados", async () => {
  const fixture = buildFixture({ items: [elemento({ reservado: true })] })
  const outcome = await llamarDelete(fixture, ITEM_ID)
  assert.deepEqual(outcome, { status: 200, body: { success: true } })
  assert.deepEqual(fixture.state.items, [])
  const borrado = borradosElementos(fixture)[0]
  assert.deepEqual(borrado.filters, { id: ITEM_ID })
})

test("un editor histórico no puede borrar elementos del congelador compartido", async () => {
  const fixture = buildFixture({
    profile: { role: "user_full" },
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("editor", FREEZER_AJENO_ID)],
    drawers: [cajon(9, FREEZER_AJENO_ID)],
    items: [elemento({ cajon_id: "cajon-9", cajones_congelador: { id: "cajon-9", congelador_id: FREEZER_AJENO_ID } })],
  })
  const outcome = await llamarDelete(fixture, ITEM_ID)
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.equal(fixture.state.items.length, 1)
})

test("un fallo de borrado responde 500 genérico sin filtrar el mensaje SQL y sin alterar datos", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  fixture.state.forced["elementos_cajon:delete"] = SQL_INTERNAL_ERROR
  const { resultado: outcome, llamadas } = await capturarConsoleError(() => llamarDelete(fixture, ITEM_ID))
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  const registro = llamadas.flat().join(" ")
  assert.equal(registro.includes(SQL_INTERNAL_ERROR.message), false)
  assert.equal(fixture.state.items.length, 1)
})

// --- Contratos de adaptadores ---

test("app/api/freezer/items/route.ts delega en el manejador puro con clientes de servidor", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/freezer/items/route.ts"), "utf8")
  assert.match(source, /createFreezerSessionClient/)
  assert.match(source, /createFreezerAdminClient/)
  assert.match(source, /handleFreezerItemPost/)
  assert.match(source, /force-dynamic/)
  assert.doesNotMatch(source, /bearer|authorization/i)
  assert.doesNotMatch(source, /request\.headers/)
})

test("app/api/freezer/items/route.ts no filtra mensajes internos ni SQL", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../app/api/freezer/items/route.ts"), "utf8")
  assert.doesNotMatch(source, /error\.message/i)
  assert.doesNotMatch(source, /\(error as Error\)/)
  assert.match(source, /FREEZER_ACCESS_ERRORS\.internal/)
})

test("app/api/freezer/items/[itemId]/route.ts delega en los manejadores puros con clientes de servidor", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../../app/api/freezer/items/[itemId]/route.ts"),
    "utf8",
  )
  assert.match(source, /createFreezerSessionClient/)
  assert.match(source, /createFreezerAdminClient/)
  assert.match(source, /handleFreezerItemPatch/)
  assert.match(source, /handleFreezerItemDelete/)
  assert.match(source, /force-dynamic/)
  assert.doesNotMatch(source, /bearer|authorization/i)
  assert.doesNotMatch(source, /request\.headers/)
})

test("app/api/freezer/items/[itemId]/route.ts no filtra mensajes internos ni SQL", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../../app/api/freezer/items/[itemId]/route.ts"),
    "utf8",
  )
  assert.doesNotMatch(source, /error\.message/i)
  assert.doesNotMatch(source, /\(error as Error\)/)
  assert.match(source, /FREEZER_ACCESS_ERRORS\.internal/)
})

test("las rutas de elementos aplican el límite de tamaño del cuerpo", () => {
  for (const ruta of ["app/api/freezer/items/route.ts", "app/api/freezer/items/[itemId]/route.ts"]) {
    const source = fs.readFileSync(path.resolve(__dirname, "../../../", ruta), "utf8")
    assert.match(source, /readFreezerJsonBody/, `${ruta} debe usar el lector con límite`)
  }
})

test("lib/freezer-access.ts reexporta los manejadores de elementos", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../lib/freezer-access.ts"), "utf8")
  assert.match(source, /handleFreezerItemPost/)
  assert.match(source, /handleFreezerItemPatch/)
  assert.match(source, /handleFreezerItemDelete/)
  assert.match(source, /readFreezerJsonBody/)
})

test("components/freezer/freezer-manager.tsx conserva los contratos HTTP de elementos", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../components/freezer/freezer-manager.tsx"), "utf8")
  assert.match(source, /\/api\/freezer\/items/)
  assert.match(source, /drawerId,\s*updates/)
  assert.match(source, /credentials:\s*"include"/)
})
