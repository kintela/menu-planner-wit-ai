const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "../../..")

const {
  FreezerPresentacionError,
  buildNewItemForm,
  buildItemFormState,
  buildItemPayload,
  buildItemUpdates,
  filtrarPorBusqueda,
  buildVistaCajon,
  buildPresentacionAcceso,
  debeOfrecerVaciado,
} = require("../../../lib/freezer/freezer-presentation")

// La validación de cantidad y estado se delega en el dominio de T2, que
// propaga FreezerDomainError con mensaje español; la presentación añade sus
// propios errores tipados (nombre/cajón).
const failCode = (code, run) => {
  assert.throws(
    run,
    (error) => (error instanceof FreezerPresentacionError || error?.name === "FreezerDomainError") && error.code === code,
  )
}

const ITEM_BASE = {
  id: "item-1",
  cajon_id: "cajon-1",
  nombre: "Pechuga de pollo",
  cantidad: 1.5,
  unidad: "kg",
  estado: "fresco",
  categoria: "Carnes",
  fecha_compra: "2026-10-20",
  fecha_congelacion: "2026-10-21",
  fecha_caducidad: "2026-12-31",
  notas: "En dos filetes",
  reservado: false,
}

test("el alta propone compra y congelación con la fecha pasada explícitamente y caducidad vacía", () => {
  const formulario = buildNewItemForm("2026-10-26")
  assert.equal(formulario.fecha_compra, "2026-10-26")
  assert.equal(formulario.fecha_congelacion, "2026-10-26")
  assert.equal(formulario.fecha_caducidad, "")
  assert.equal(formulario.cantidad, "")
  assert.equal(formulario.estado, "fresco")
  assert.equal(formulario.nombre, "")
})

test("el formulario de edición muestra la cantidad sin valor cuando no existe y editable cuando existe", () => {
  assert.equal(buildItemFormState({ ...ITEM_BASE, cantidad: null }).cantidad, "")
  assert.equal(buildItemFormState({ ...ITEM_BASE, cantidad: undefined }).cantidad, "")
  assert.equal(buildItemFormState({ ...ITEM_BASE, cantidad: 0 }).cantidad, "0")
  assert.equal(buildItemFormState({ ...ITEM_BASE, cantidad: 1.5 }).cantidad, "1.5")
  const formulario = buildItemFormState(ITEM_BASE)
  assert.equal(formulario.nombre, "Pechuga de pollo")
  assert.equal(formulario.cajon_id, "cajon-1")
  assert.equal(formulario.estado, "fresco")
  assert.equal(formulario.fecha_compra, "2026-10-20")
})

test("el alta admite cantidad libre: vacío, 0, enteros y decimales con coma o punto", () => {
  const vacio = buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "" }, "c1")
  assert.equal("cantidad" in vacio, false)
  assert.equal(buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "0" }, "c1").cantidad, 0)
  assert.equal(buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: 0 }, "c1").cantidad, 0)
  assert.equal(buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "3" }, "c1").cantidad, 3)
  assert.equal(buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "1,5" }, "c1").cantidad, 1.5)
  assert.equal(buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "1.5" }, "c1").cantidad, 1.5)
})

test("el alta rechaza nombre vacío, cantidad no numérica o negativa y estado fuera de catálogo", () => {
  failCode("NOMBRE_OBLIGATORIO", () => buildItemPayload({ nombre: "   ", cajon_id: "c1", estado: "fresco" }, "c1"))
  failCode("INVALID_CANTIDAD", () => buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "abc" }, "c1"))
  failCode("INVALID_CANTIDAD", () => buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "-1" }, "c1"))
  failCode("INVALID_ESTADO", () => buildItemPayload({ nombre: "A", cajon_id: "c1", estado: "congelado" }, "c1"))
})

test("los mensajes de validación de la presentación son comprensibles en español", () => {
  assert.throws(() => buildItemPayload({ nombre: "", cajon_id: "c1", estado: "fresco" }, "c1"), /obligatorio/)
  assert.throws(() => buildItemUpdates({ nombre: "A", estado: "fresco", cajon_id: "c1", cantidad: "x" }), /no negativo/)
})

test("el alta recorta los textos y omite los opcionales vacíos", () => {
  const payload = buildItemPayload(
    { nombre: " A ", cajon_id: " c1 ", estado: "fresco", unidad: " kg ", notas: "  ", categoria: "", fecha_compra: "2026-10-26" },
    "c1",
  )
  assert.equal(payload.nombre, "A")
  assert.equal(payload.cajon_id, "c1")
  assert.equal(payload.unidad, "kg")
  assert.equal("notas" in payload, false)
  assert.equal("categoria" in payload, false)
  assert.equal(payload.fecha_compra, "2026-10-26")
  assert.equal("fecha_caducidad" in payload, false)
})

test("la edición limpia campos opcionales a null y admite cantidad nula, cero y decimal", () => {
  assert.deepEqual(
    buildItemUpdates({ nombre: "A", cajon_id: "c1", estado: "abierto", cantidad: "" }),
    {
      cajon_id: "c1",
      nombre: "A",
      estado: "abierto",
      cantidad: null,
      unidad: null,
      notas: null,
      categoria: null,
      fecha_compra: null,
      fecha_congelacion: null,
      fecha_caducidad: null,
    },
  )
  assert.equal(buildItemUpdates({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "0" }).cantidad, 0)
  assert.equal(buildItemUpdates({ nombre: "A", cajon_id: "c1", estado: "fresco", cantidad: "2,5" }).cantidad, 2.5)
  failCode("NOMBRE_OBLIGATORIO", () => buildItemUpdates({ nombre: " ", estado: "fresco" }))
  failCode("CAJON_OBLIGATORIO", () => buildItemUpdates({ nombre: "A", estado: "fresco", cajon_id: "  " }))
})

test("la búsqueda localiza un elemento por lo que se ve: fecha es-ES y cantidad tal como aparece", () => {
  assert.equal(filtrarPorBusqueda([ITEM_BASE], "31/12/2026").length, 1)
  assert.equal(filtrarPorBusqueda([ITEM_BASE], "20/10/2026").length, 1)
  assert.equal(filtrarPorBusqueda([ITEM_BASE], "1,5 kg").length, 1)
  assert.equal(filtrarPorBusqueda([ITEM_BASE], "pechu").length, 1)
  assert.equal(filtrarPorBusqueda([ITEM_BASE], "PECHUGA").length, 1)
  assert.equal(filtrarPorBusqueda([ITEM_BASE], "filetes").length, 1)
})

test("la búsqueda no opera sobre los valores almacenados sino sobre lo mostrado", () => {
  assert.equal(filtrarPorBusqueda([ITEM_BASE], "2026-12-31").length, 0)
  assert.equal(filtrarPorBusqueda([ITEM_BASE], "1.5").length, 0)
})

test("la búsqueda vacía muestra todos los elementos y no altera los datos", () => {
  const items = [ITEM_BASE]
  const visibles = filtrarPorBusqueda(items, "")
  assert.equal(visibles.length, 1)
  assert.equal(visibles[0], items[0])
  assert.deepEqual(buildVistaCajon({ id: "d", items }, "   ").visibles, items)
})

test("los cajones permanecen visibles: la búsqueda solo filtra el contenido y marca sin coincidencias", () => {
  const drawer = { id: "d1", nombre: "Cajón 1", items: [ITEM_BASE, { ...ITEM_BASE, id: "item-2", nombre: "Guiso" }] }
  const vacio = { id: "d2", nombre: "Cajón 2", items: [] }

  const conResultados = buildVistaCajon(drawer, "pechu")
  assert.equal(conResultados.visibles.length, 1)
  assert.equal(conResultados.total, 2)
  assert.equal(conResultados.sinCoincidencias, false)

  const sinResultados = buildVistaCajon(drawer, "zzz")
  assert.equal(sinResultados.visibles.length, 0)
  assert.equal(sinResultados.sinCoincidencias, true)
  assert.equal(sinResultados.items.length, 2, "el cajón conserva sus datos: el filtro es solo presentación")

  assert.equal(buildVistaCajon(vacio, "pechu").sinCoincidencias, false, "un cajón vacío no marca sin coincidencias")
  assert.equal(buildVistaCajon(vacio, "pechu").total, 0)
})

test("la presentación del singleton solo muestra el menú y controles al administrador ya autorizado", () => {
  assert.deepEqual(buildPresentacionAcceso(true), {
    esAdministradorAutorizado: true,
    mostrarMenu: true,
    puedeLeer: true,
    puedeEscribir: true,
  })
  assert.deepEqual(buildPresentacionAcceso(false), {
    esAdministradorAutorizado: false,
    mostrarMenu: false,
    puedeLeer: false,
    puedeEscribir: false,
  })
  assert.deepEqual(buildPresentacionAcceso(null), {
    esAdministradorAutorizado: false,
    mostrarMenu: false,
    puedeLeer: false,
    puedeEscribir: false,
  })
})

test("el vaciado por cajón solo se ofrece con elementos; no existe vaciado global", () => {
  assert.equal(debeOfrecerVaciado({ items: [ITEM_BASE] }), true)
  assert.equal(debeOfrecerVaciado({ items: [] }), false)
  assert.equal(debeOfrecerVaciado(null), false)
})

test("la librería de presentación es pura: sin reloj global, red ni Supabase", () => {
  const source = fs.readFileSync(path.join(root, "lib/freezer/freezer-presentation.js"), "utf8")
  assert.doesNotMatch(source, /new Date|Date\.now|fetch\(|createClient|\.from\(/i)
})

test("la UI de gestión solo habla con los contratos HTTP de T4–T7 sin identidad ni tablas directas", () => {
  const source = fs.readFileSync(path.join(root, "components/freezer/freezer-manager.tsx"), "utf8")
  assert.doesNotMatch(source, /\.from\(/)
  assert.match(source, /["']\/api\/freezer["']/)
  assert.match(source, /["']\/api\/freezer\/drawers["']/)
  assert.match(source, /["']\/api\/freezer\/items["']/)
  assert.match(source, /api\/freezer\/drawers\/\$\{drawerId\}\/items/)
  assert.doesNotMatch(source, /api\/freezer\/(clear|empty|wipe)/)
  assert.doesNotMatch(source, /bearer|authorization|access_token/i)
})

test("la UI edita la cantidad como texto libre validada con el dominio, sin lista fija", () => {
  const source = fs.readFileSync(path.join(root, "components/freezer/freezer-manager.tsx"), "utf8")
  assert.doesNotMatch(source, /QUANTITY_OPTIONS/)
  assert.doesNotMatch(source, /parsedQuantity/)
  assert.match(source, /id=\{`item-cantidad-\$\{drawer\.id\}`\}[^>]*type="text"/s)
  assert.match(source, /id=\{fieldId\("cantidad"\)\}[^>]*type="text"/s)
  assert.doesNotMatch(source, /<select[^>]*item-cantidad/s)
  assert.doesNotMatch(source, /<select[^>]*fieldId\("cantidad"\)/s)
  assert.match(source, /buildItemPayload|buildItemUpdates/)
})

test("la UI busca sobre lo mostrado y mantiene los cajones visibles sin filtros estructurados", () => {
  const source = fs.readFileSync(path.join(root, "components/freezer/freezer-manager.tsx"), "utf8")
  assert.match(source, /buildVistaCajon/)
  assert.doesNotMatch(source, /itemMatchesSearch/)
  assert.doesNotMatch(source, /Filtrar por/i)
})

test("la UI solo presenta consulta, impresión y controles al singleton autorizado por servidor", () => {
  const source = fs.readFileSync(path.join(root, "components/freezer/freezer-manager.tsx"), "utf8")
  assert.match(source, /buildPresentacionAcceso/)
  assert.doesNotMatch(source, /buildPresentacionRol/)
  assert.doesNotMatch(source, /esCompartido|accessRole/)
  assert.match(source, /\{canWrite \? \(/)
  assert.match(source, /["']\/freezer\/print["']/)
  assert.match(source, /drawer-search/)
})

test("la navegación no enumera ni enlaza el congelador hasta confirmación de la API", () => {
  const source = fs.readFileSync(path.join(root, "components/simple-navigation.tsx"), "utf8")
  assert.match(source, /\/api\/freezer/)
  assert.match(source, /isOwner === true/)
  assert.match(source, /freezerAvailable/)
})

test("las confirmaciones de eliminación y vaciado se conservan: cancelar no altera datos", () => {
  const source = fs.readFileSync(path.join(root, "components/freezer/freezer-manager.tsx"), "utf8")
  assert.match(source, /title="Eliminar elemento"/)
  assert.match(source, /title="Vaciar cajón"/)
  assert.match(source, /onClose=\{\(\) => setPendingDeletion\(null\)\}/)
  assert.match(source, /onClose=\{\(\) => setPendingDrawerClear\(null\)\}/)
  assert.match(source, /debeOfrecerVaciado/)
})

test("los formularios de alta derivan los defaults de la fecha del navegador pasada explícitamente", () => {
  const source = fs.readFileSync(path.join(root, "components/freezer/freezer-manager.tsx"), "utf8")
  assert.match(source, /buildNewItemForm\(getTodayISO\(\)\)/)
})
