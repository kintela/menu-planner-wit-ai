const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const test = require("node:test")

const {
  FREEZER_ACCESS_ERRORS,
  handleFreezerDrawerItemsDelete,
} = require("../../../lib/freezer/freezer-access-logic")

const USER = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"
const FREEZER_ID = "33333333-3333-4333-8333-333333333333"
const FREEZER_AJENO_ID = "44444444-4444-4444-8444-444444444444"
const DRAWER_ID = "cajon-1"
const DRAWER_2_ID = "cajon-2"
const DRAWER_AJENO_ID = "cajon-9"

const MENSAJE_FALTA_CAJON_ID = "Falta el identificador del cajón."

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
      "elementos_cajon:delete": null,
      "cajones_congelador:select": null,
    },
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
    if (call.action === "delete") {
      state.items = state.items.filter((row) => !matchFilters(row, call.filters))
      return { data: null, error: null }
    }
    throw new Error(`acción inesperada en elementos_cajon: ${call.action}`)
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
        delete() {
          call.action = "delete"
          return builder
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
  id: `elem-${state_aleatorio()}`,
  cajon_id: DRAWER_ID,
  nombre: "Filete de ternera",
  reservado: false,
  ...overrides,
})

let contadorElementos = 0
const state_aleatorio = () => {
  contadorElementos += 1
  return contadorElementos
}

const llamarDelete = (fixture, drawerId) =>
  handleFreezerDrawerItemsDelete({ sessionClient: fixture.sessionClient, adminClient: fixture.adminClient, drawerId })

const borradosElementos = (fixture) =>
  fixture.state.calls.filter((call) => call.table === "elementos_cajon" && call.action === "delete")

// --- Estructura de la petición ---

test("un DELETE sin identificador de cajón se rechaza con 400", async () => {
  for (const drawerId of [undefined, "", "   ", 5]) {
    const fixture = buildFixture()
    const outcome = await llamarDelete(fixture, drawerId)
    assert.deepEqual(outcome, { status: 400, body: { error: MENSAJE_FALTA_CAJON_ID } })
    assert.deepEqual(borradosElementos(fixture), [])
  }
})

// --- Matriz de acceso (RF-18, RF-24, RF-27) ---

test("un visitante sin sesión recibe 401 en español y no vacía nada", async () => {
  const fixture = buildFixture({ user: null, items: [elemento()] })
  const outcome = await llamarDelete(fixture, DRAWER_ID)
  assert.deepEqual(outcome, {
    status: 401,
    body: { error: FREEZER_ACCESS_ERRORS.unauthenticated.message },
  })
  assert.deepEqual(borradosElementos(fixture), [])
  assert.equal(fixture.state.items.length, 1)
})

test("un usuario sin perfil vigente recibe la denegación genérica y no vacía nada", async () => {
  for (const perfil of [null, { role: null }, { role: "moderator" }]) {
    const fixture = buildFixture({ profile: perfil, items: [elemento()] })
    const outcome = await llamarDelete(fixture, DRAWER_ID)
    assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.profileDenied.status)
    assert.equal(outcome.body.error, FREEZER_ACCESS_ERRORS.profileDenied.message)
    assert.deepEqual(borradosElementos(fixture), [])
    assert.equal(fixture.state.items.length, 1)
  }
})

test("un viewer histórico no obtiene acceso ni vacía el cajón", async () => {
  const fixture = buildFixture({ profile: { role: "user_full" }, memberships: [membership("viewer")], items: [elemento()] })
  const outcome = await llamarDelete(fixture, DRAWER_ID)
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.deepEqual(borradosElementos(fixture), [])
  assert.equal(fixture.state.items.length, 1)
})

test("el cajón de un congelador ajeno responde 404 uniforme sin revelar su existencia", async () => {
  const fixture = buildFixture({
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("owner")],
    drawers: [cajon(1), cajon(9, FREEZER_AJENO_ID)],
    items: [elemento({ cajon_id: DRAWER_AJENO_ID })],
  })
  const outcome = await llamarDelete(fixture, DRAWER_AJENO_ID)
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(borradosElementos(fixture), [])
  assert.equal(fixture.state.items.length, 1, "el elemento del cajón ajeno no se elimina")
})

test("un cajón inexistente responde 404 uniforme sin borrar nada", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  const outcome = await llamarDelete(fixture, "cajon-fantasma")
  assert.deepEqual(outcome, {
    status: FREEZER_ACCESS_ERRORS.notFound.status,
    body: { error: FREEZER_ACCESS_ERRORS.notFound.message },
  })
  assert.deepEqual(borradosElementos(fixture), [])
  assert.equal(fixture.state.items.length, 1)
})

test("una membership con rol malformado deniega con 404 uniforme sin degradar a editor", async () => {
  const fixture = buildFixture({
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("owner"), membership("superadmin", FREEZER_AJENO_ID)],
    drawers: [cajon(1), cajon(9, FREEZER_AJENO_ID)],
    items: [elemento({ cajon_id: DRAWER_AJENO_ID })],
  })
  const outcome = await llamarDelete(fixture, DRAWER_AJENO_ID)
  assert.equal(outcome.status, FREEZER_ACCESS_ERRORS.notFound.status)
  assert.deepEqual(borradosElementos(fixture), [])
  assert.equal(fixture.state.items.length, 1)
})

// --- Vaciado autorizado (RF-18, RF-19) ---

test("el propietario vacía su cajón sin enviar confirmación: la confirmación es presentación", async () => {
  const fixture = buildFixture({ items: [elemento(), elemento({ reservado: true })] })
  // El manejador no recibe ningún cuerpo ni campo de confirmación: la operación
  // autorizada se ejecuta tal cual (la confirmación previa es UI de T8).
  const outcome = await llamarDelete(fixture, DRAWER_ID)
  assert.deepEqual(outcome, { status: 200, body: { success: true } })
  assert.deepEqual(fixture.state.items, [])
})

test("el propietario histórico sin membership vacía por el fallback de propietarios antiguos", async () => {
  const fixture = buildFixture({ memberships: [], items: [elemento()] })
  const outcome = await llamarDelete(fixture, DRAWER_ID)
  assert.deepEqual(outcome, { status: 200, body: { success: true } })
  assert.deepEqual(fixture.state.items, [])
})

test("un editor histórico no puede vaciar un cajón compartido", async () => {
  const fixture = buildFixture({
    profile: { role: "user_full" },
    freezers: [freezerPropio(), freezerAjeno()],
    memberships: [membership("editor", FREEZER_AJENO_ID)],
    drawers: [cajon(9, FREEZER_AJENO_ID)],
    items: [elemento({ cajon_id: DRAWER_AJENO_ID })],
  })
  const outcome = await llamarDelete(fixture, DRAWER_AJENO_ID)
  assert.deepEqual(outcome, { status: FREEZER_ACCESS_ERRORS.profileDenied.status, body: { error: FREEZER_ACCESS_ERRORS.profileDenied.message } })
  assert.equal(fixture.state.items.length, 1)
})

test("el vaciado de un cajón ya vacío responde 200 sin error y conserva el cajón", async () => {
  const fixture = buildFixture({ items: [] })
  const outcome = await llamarDelete(fixture, DRAWER_ID)
  assert.deepEqual(outcome, { status: 200, body: { success: true } })
  assert.deepEqual(fixture.state.drawers, [cajon(1), cajon(2)], "el cajón vacío sigue existiendo")
})

test("el vaciado es definitivo e incluye los elementos reservados", async () => {
  const fixture = buildFixture({
    items: [
      elemento({ reservado: true, nombre: "Reservado A" }),
      elemento({ reservado: false, nombre: "Normal B" }),
      elemento({ reservado: true, nombre: "Reservado C", cajon_id: DRAWER_2_ID }),
    ],
  })
  const outcome = await llamarDelete(fixture, DRAWER_ID)
  assert.deepEqual(outcome, { status: 200, body: { success: true } })
  assert.deepEqual(
    fixture.state.items.map((item) => item.nombre),
    ["Reservado C"],
    "los reservados del cajón vaciado se eliminan; lo de otros cajones permanece",
  )
})

test("el contaje es exacto: un único borrado filtrado por el cajón, sin tocar otros cajones", async () => {
  const fixture = buildFixture({
    items: [
      elemento({ id: "elem-a", cajon_id: DRAWER_ID }),
      elemento({ id: "elem-b", cajon_id: DRAWER_ID }),
      elemento({ id: "elem-c", cajon_id: DRAWER_ID }),
      elemento({ id: "elem-d", cajon_id: DRAWER_2_ID }),
      elemento({ id: "elem-e", cajon_id: DRAWER_2_ID }),
    ],
  })
  const outcome = await llamarDelete(fixture, DRAWER_ID)
  assert.deepEqual(outcome, { status: 200, body: { success: true } })

  const borrados = borradosElementos(fixture)
  assert.equal(borrados.length, 1, "una única operación de borrado")
  assert.deepEqual(borrados[0].filters, { cajon_id: DRAWER_ID }, "el borrado se filtra por el cajón indicado")

  assert.deepEqual(
    fixture.state.items.map((item) => item.id).sort(),
    ["elem-d", "elem-e"],
    "exactamente los 3 elementos del cajón desaparecen y los 2 de otros cajones permanecen",
  )
  assert.deepEqual(fixture.state.drawers, [cajon(1), cajon(2)], "el cajón vaciado sigue existiendo y vacío")
})

// --- Errores internos (RF-24, RF-27) ---

test("un fallo al leer el cajón responde 500 genérico sin filtrar el mensaje SQL", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  fixture.state.forced["cajones_congelador:select"] = SQL_INTERNAL_ERROR
  const { resultado: outcome, llamadas } = await capturarConsoleError(() => llamarDelete(fixture, DRAWER_ID))
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  const registro = llamadas.flat().join(" ")
  assert.equal(registro.includes(SQL_INTERNAL_ERROR.message), false)
  assert.equal(fixture.state.items.length, 1)
})

test("un fallo de borrado responde 500 genérico sin filtrar el mensaje SQL y sin alterar datos", async () => {
  const fixture = buildFixture({ items: [elemento()] })
  fixture.state.forced["elementos_cajon:delete"] = SQL_INTERNAL_ERROR
  const { resultado: outcome, llamadas } = await capturarConsoleError(() => llamarDelete(fixture, DRAWER_ID))
  assert.deepEqual(outcome, {
    status: 500,
    body: { error: FREEZER_ACCESS_ERRORS.internal.message },
  })
  const registro = llamadas.flat().join(" ")
  assert.equal(registro.includes(SQL_INTERNAL_ERROR.message), false)
  assert.equal(fixture.state.items.length, 1, "un fallo del vaciado no elimina nada")
})

// --- Contratos de adaptadores y ausencia de vaciado global (RF-19) ---

const listarArchivos = (dir) => {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const ruta = path.join(dir, entry.name)
    return entry.isDirectory() ? listarArchivos(ruta) : [ruta]
  })
}

test("app/api/freezer/drawers/[drawerId]/items/route.ts delega en el manejador puro con clientes de servidor", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../../app/api/freezer/drawers/[drawerId]/items/route.ts"),
    "utf8",
  )
  assert.match(source, /createFreezerSessionClient/)
  assert.match(source, /createFreezerAdminClient/)
  assert.match(source, /handleFreezerDrawerItemsDelete/)
  assert.match(source, /force-dynamic/)
  assert.doesNotMatch(source, /bearer|authorization/i)
  assert.doesNotMatch(source, /request\.headers/)
  assert.doesNotMatch(source, /resolveAuthenticatedFreezerUserId/, "la identidad usa la capa común, no el helper antiguo")
  // La confirmación es presentación (T8): la ruta no lee cuerpo de la petición.
  assert.doesNotMatch(source, /request\.(json|text|body)/)
  assert.doesNotMatch(source, /readFreezerJsonBody/)
})

test("app/api/freezer/drawers/[drawerId]/items/route.ts no filtra mensajes internos ni SQL", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../../app/api/freezer/drawers/[drawerId]/items/route.ts"),
    "utf8",
  )
  assert.doesNotMatch(source, /error\.message/i)
  assert.doesNotMatch(source, /\(error as Error\)/)
  assert.match(source, /FREEZER_ACCESS_ERRORS\.internal/)
})

test("lib/freezer-access.ts reexporta el manejador de vaciado por cajón", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../../../lib/freezer-access.ts"), "utf8")
  assert.match(source, /handleFreezerDrawerItemsDelete/)
})

test("no existe ninguna acción de vaciado global del congelador en servidor ni UI (RF-19)", () => {
  const raizApi = path.resolve(__dirname, "../../../app/api/freezer")
  const rutas = listarArchivos(raizApi).filter((archivo) => /route\.ts$/.test(archivo))

  // Las únicas rutas de escritura masiva del servidor son el borrado individual
  // de elemento y el vaciado por cajón; ninguna borra el congelador entero.
  const rutasConDelete = rutas
    .map((ruta) => ({ ruta, source: fs.readFileSync(ruta, "utf8") }))
    .filter(({ source }) => /export\s+async\s+function\s+DELETE/.test(source))
    .map(({ ruta }) => ruta.replace(raizApi + path.sep, ""))

  assert.deepEqual(
    rutasConDelete.sort(),
    ["drawers/[drawerId]/items/route.ts", "items/[itemId]/route.ts"].sort(),
    "solo existen DELETE por elemento y vaciado por cajón",
  )

  const logicSource = fs.readFileSync(
    path.resolve(__dirname, "../../../lib/freezer/freezer-access-logic.js"),
    "utf8",
  )
  assert.match(logicSource, /elementos_cajon"\)\s*\.delete\(\)\s*\.eq\("cajon_id"/, "el vaciado por cajón existe")
  assert.doesNotMatch(logicSource, /\.delete\(\)\s*\.\s*neq\(/, "no hay borrados «todos menos uno»")
  assert.doesNotMatch(
    logicSource,
    /handleFreezerClearAll|handleFreezerGlobalClear|vaciarCongelador|emptyFreezer|clearFreezer|vaciar_congelador/i,
    "no existe ningún manejador de vaciado global",
  )

  for (const archivo of [...rutas, ...listarArchivos(path.resolve(__dirname, "../../../components/freezer"))]) {
    const fuente = fs.readFileSync(archivo, "utf8")
    assert.doesNotMatch(
      fuente,
      /vaciado\s+global|vaciar\s+congelador|vaciar\s+todo|vaciarTodo|emptyFreezer|clearFreezer|clearAllDrawers|clearAllItems/i,
      `${archivo} no ofrece vaciado global`,
    )
  }

  const manager = fs.readFileSync(
    path.resolve(__dirname, "../../../components/freezer/freezer-manager.tsx"),
    "utf8",
  )
  assert.match(manager, /api\/freezer\/drawers\/\$\{drawerId\}\/items/, "el vaciado en UI es por cajón")
  assert.doesNotMatch(manager, /api\/freezer\/(clear|empty|wipe)/, "no existe endpoint de vaciado global en UI")
})
