const test = require("node:test")
const assert = require("node:assert/strict")

const {
  ESTADOS_ELEMENTO,
  FreezerDomainError,
  parseEstado,
  parseCantidad,
  formatCantidadMostrada,
  formatFechaMostrada,
  buildRepresentacionMostrada,
  coincideConBusqueda,
  decidirCajones,
  buildCajonesNuevos,
  puedeEscribir,
  puedeLeer,
} = require("../../../lib/freezer/freezer-domain")

const failCode = (code, run) => {
  assert.throws(run, (error) => error instanceof FreezerDomainError && error.code === code)
}

test("estado catalog is closed and exposes exactly the four agreed values", () => {
  assert.deepEqual([...ESTADOS_ELEMENTO], ["fresco", "abierto", "bajo", "agotado"])
  assert.ok(Object.isFrozen(ESTADOS_ELEMENTO))
})

test("parseEstado accepts only exact catalog values", () => {
  for (const estado of ["fresco", "abierto", "bajo", "agotado"]) {
    assert.equal(parseEstado(estado), estado)
  }
})

test("parseEstado rejects empty, manipulated and out-of-catalog values with typed error", () => {
  for (const valor of ["", "   ", "FRESCO", " fresco", "fresco ", "otro", null, undefined, 7, {}]) {
    failCode("INVALID_ESTADO", () => parseEstado(valor))
  }
})

test("parseCantidad accepts absence as null", () => {
  assert.equal(parseCantidad(null), null)
  assert.equal(parseCantidad(undefined), null)
  assert.equal(parseCantidad(""), null)
  assert.equal(parseCantidad("   "), null)
})

test("parseCantidad accepts zero, integers and numbers", () => {
  assert.equal(parseCantidad(0), 0)
  assert.equal(parseCantidad(2), 2)
  assert.equal(parseCantidad(1.5), 1.5)
  assert.equal(parseCantidad("3"), 3)
})

test("parseCantidad accepts decimals with comma and dot and normalizes comma to dot", () => {
  assert.equal(parseCantidad("1,5"), 1.5)
  assert.equal(parseCantidad("1.5"), 1.5)
  assert.equal(parseCantidad("0,25"), 0.25)
  assert.equal(parseCantidad(" 2,5 "), 2.5)
})

test("parseCantidad rejects negatives, non-numeric and non-interpretable formats with typed error", () => {
  for (const valor of [-1, -0.5, "-1", "-1,5", "abc", "1,2,3", "1.2.3", "1.", ".5", "1e3", "1 000", "+3", true, false, NaN, Infinity, {}]) {
    failCode("INVALID_CANTIDAD", () => parseCantidad(valor))
  }
})

test("formatCantidadMostrada renders zero and decimals as seen on screen, with and without unit", () => {
  assert.equal(formatCantidadMostrada(null, "kg"), "")
  assert.equal(formatCantidadMostrada(undefined, null), "")
  assert.equal(formatCantidadMostrada(0, null), "0")
  assert.equal(formatCantidadMostrada(0, "kg"), "0 kg")
  assert.equal(formatCantidadMostrada(1.5, "kg"), "1,5 kg")
  assert.equal(formatCantidadMostrada("1,5", null), "1,5")
  assert.equal(formatCantidadMostrada(2, ""), "2")
  assert.equal(formatCantidadMostrada(3, "  "), "3")
})

test("formatFechaMostrada renders dates in es-ES and absence without value", () => {
  assert.equal(formatFechaMostrada(null), "")
  assert.equal(formatFechaMostrada(undefined), "")
  assert.equal(formatFechaMostrada(""), "")
  assert.equal(formatFechaMostrada("2026-10-26"), "26/10/2026")
  assert.equal(formatFechaMostrada("2026-01-05"), "05/01/2026")
  failCode("INVALID_FECHA", () => formatFechaMostrada("26/10/2026"))
  failCode("INVALID_FECHA", () => formatFechaMostrada("2026-13-01"))
})

test("buildRepresentacionMostrada builds the complete displayed representation", () => {
  const elemento = {
    nombre: "Pez espada",
    cantidad: 1.5,
    unidad: "kg",
    estado: "fresco",
    categoria: "Pescado",
    fecha_compra: "2026-10-20",
    fecha_congelacion: "2026-10-21",
    fecha_caducidad: "2026-11-30",
    notas: "En lonchas",
    reservado: true,
  }
  assert.deepEqual(buildRepresentacionMostrada(elemento), {
    nombre: "Pez espada",
    categoria: "Pescado",
    notas: "En lonchas",
    unidad: "kg",
    estado: "fresco",
    cantidadMostrada: "1,5 kg",
    fechaCompraMostrada: "20/10/2026",
    fechaCongelacionMostrada: "21/10/2026",
    fechaCaducidadMostrada: "30/11/2026",
    reservado: true,
  })
})

test("buildRepresentacionMostrada tolerates missing optional data without throwing", () => {
  assert.deepEqual(buildRepresentacionMostrada({ nombre: "Guisantes", estado: "fresco" }), {
    nombre: "Guisantes",
    categoria: "",
    notas: "",
    unidad: "",
    estado: "fresco",
    cantidadMostrada: "",
    fechaCompraMostrada: "",
    fechaCongelacionMostrada: "",
    fechaCaducidadMostrada: "",
    reservado: false,
  })
  assert.deepEqual(buildRepresentacionMostrada(null).nombre, "")
})

test("coincideConBusqueda is partial and case-insensitive over the displayed representation", () => {
  const representacion = buildRepresentacionMostrada({
    nombre: "Pez espada",
    cantidad: 1.5,
    unidad: "kg",
    estado: "fresco",
    categoria: "Pescado",
    fecha_caducidad: "2026-11-30",
    notas: "En lonchas",
  })
  assert.equal(coincideConBusqueda(representacion, "pez"), true)
  assert.equal(coincideConBusqueda(representacion, "ESPADA"), true)
  assert.equal(coincideConBusqueda(representacion, "lonch"), true)
  assert.equal(coincideConBusqueda(representacion, "30/11/2026"), true)
  assert.equal(coincideConBusqueda(representacion, "1,5"), true)
  assert.equal(coincideConBusqueda(representacion, "kg"), true)
  assert.equal(coincideConBusqueda(representacion, "fres"), true)
})

test("coincideConBusqueda is literal otherwise and handles blank and unmatched terms", () => {
  const representacion = buildRepresentacionMostrada({ nombre: "Guisantes", estado: "bajo" })
  assert.equal(coincideConBusqueda(representacion, ""), true)
  assert.equal(coincideConBusqueda(representacion, "   "), true)
  assert.equal(coincideConBusqueda(representacion, "zzz"), false)
  assert.equal(coincideConBusqueda(representacion, "guisantes congelados"), false)
  assert.equal(coincideConBusqueda(representacion, "g u"), false)
  assert.equal(coincideConBusqueda(null, "pez"), false)
})

test("decidirCajones treats an equal request as an informative no-op", () => {
  assert.deepEqual(decidirCajones({ actuales: 3, solicitados: 3 }), { tipo: "sin-cambios", aCrear: 0 })
  assert.deepEqual(decidirCajones({ actuales: 5, solicitados: 5 }), { tipo: "sin-cambios", aCrear: 0 })
})

test("decidirCajones rejects reduction, out-of-range and non-integer values", () => {
  failCode("REDUCCION_NO_PERMITIDA", () => decidirCajones({ actuales: 4, solicitados: 2 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => decidirCajones({ actuales: 3, solicitados: 6 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => decidirCajones({ actuales: 3, solicitados: 0 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => decidirCajones({ actuales: 0, solicitados: 0 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => decidirCajones({ actuales: 3, solicitados: -1 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => decidirCajones({ actuales: 3, solicitados: 2.5 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => decidirCajones({ actuales: 2.5, solicitados: 3 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => decidirCajones({ actuales: null, solicitados: 3 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => decidirCajones({}))
})

test("decidirCajones returns the number of drawers to create for valid widenings", () => {
  assert.deepEqual(decidirCajones({ actuales: 0, solicitados: 3 }), { tipo: "ampliacion", aCrear: 3 })
  assert.deepEqual(decidirCajones({ actuales: 1, solicitados: 4 }), { tipo: "ampliacion", aCrear: 3 })
  assert.deepEqual(decidirCajones({ actuales: 4, solicitados: 5 }), { tipo: "ampliacion", aCrear: 1 })
})

test("buildCajonesNuevos assigns automatic names and continuous positions from the existing maximum", () => {
  assert.deepEqual(buildCajonesNuevos({ existentes: [], aCrear: 3 }), [
    { nombre: "Cajón 1", posicion: 1 },
    { nombre: "Cajón 2", posicion: 2 },
    { nombre: "Cajón 3", posicion: 3 },
  ])
  assert.deepEqual(
    buildCajonesNuevos({ existentes: [{ posicion: 1 }, { posicion: 3 }], aCrear: 2 }),
    [
      { nombre: "Cajón 4", posicion: 4 },
      { nombre: "Cajón 5", posicion: 5 },
    ],
  )
  assert.deepEqual(buildCajonesNuevos({ existentes: [{ posicion: 5 }], aCrear: 0 }), [])
})

test("buildCajonesNuevos rejects invalid creation requests with typed error", () => {
  failCode("CAJONES_FUERA_DE_RANGO", () => buildCajonesNuevos({ existentes: [], aCrear: -1 }))
  failCode("CAJONES_FUERA_DE_RANGO", () => buildCajonesNuevos({ existentes: [], aCrear: 1.5 }))
})

test("presentation role matrix: owner and editor write, viewer only reads", () => {
  assert.equal(puedeEscribir("owner"), true)
  assert.equal(puedeEscribir("editor"), true)
  assert.equal(puedeEscribir("viewer"), false)
  assert.equal(puedeLeer("owner"), true)
  assert.equal(puedeLeer("editor"), true)
  assert.equal(puedeLeer("viewer"), true)
})

test("presentation role matrix: values outside the closed allowlist are denied, including malformed roles", () => {
  for (const rol of ["Owner", "EDITOR", "viewer ", "admin", "superuser", "", null, undefined, 7, {}]) {
    assert.equal(puedeEscribir(rol), false, `escritura denegada para ${JSON.stringify(rol)}`)
    assert.equal(puedeLeer(rol), false, `lectura denegada para ${JSON.stringify(rol)}`)
  }
})
