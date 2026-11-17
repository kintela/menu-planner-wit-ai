const test = require("node:test")
const assert = require("node:assert/strict")

const {
  UMBRAL_MESES_POR_DEFECTO,
  DIAS_RECORDATORIO_POR_DEFECTO,
  parseMesesUmbral,
  parseDiasRecordatorio,
  calcularFechaUmbral,
  seleccionarElegibles,
  decidirAvisos,
  avisosObsoletos,
  normalizarDestinatarios,
  calcularTiempoCongelado,
} = require("../../../lib/freezer/freezer-alerts-domain")

// Spec 007 T4. El reloj se inyecta siempre: ninguna función lee la fecha actual.
const hoy = new Date("2026-11-17T08:00:00Z")

test("RF-4/RF-9 bis: los valores por defecto son 2 meses y 30 días", () => {
  assert.equal(UMBRAL_MESES_POR_DEFECTO, 2)
  assert.equal(DIAS_RECORDATORIO_POR_DEFECTO, 30)
})

test("RF-4: un umbral ausente, no numérico, negativo, cero o fraccionario cae al valor por defecto", () => {
  for (const invalido of [undefined, null, "", "  ", "abc", "-1", "0", 0, -3, "1.5", NaN, Infinity, {}]) {
    assert.equal(parseMesesUmbral(invalido), 2, `valor ${String(invalido)}`)
  }
  assert.equal(parseMesesUmbral("3"), 3)
  assert.equal(parseMesesUmbral(6), 6)
  assert.equal(parseMesesUmbral(" 4 "), 4)
})

test("RF-9 bis: un periodo de recordatorio inválido cae a 30 días", () => {
  for (const invalido of [undefined, null, "", "x", "-5", "0", 0, "2.5", NaN]) {
    assert.equal(parseDiasRecordatorio(invalido), 30, `valor ${String(invalido)}`)
  }
  assert.equal(parseDiasRecordatorio("45"), 45)
})

test("RF-3: la fecha umbral resta los meses configurados a hoy", () => {
  assert.equal(calcularFechaUmbral(hoy, 2), "2026-09-17")
  assert.equal(calcularFechaUmbral(hoy, 12), "2025-11-17")
})

test("RF-3: al restar meses se ajusta al último día del mes de destino", () => {
  assert.equal(calcularFechaUmbral(new Date("2026-03-31T08:00:00Z"), 1), "2026-02-28")
  assert.equal(calcularFechaUmbral(new Date("2028-03-31T08:00:00Z"), 1), "2028-02-29")
  assert.equal(calcularFechaUmbral(new Date("2026-01-15T08:00:00Z"), 2), "2025-11-15")
})

test("RF-3: un elemento es elegible si su fecha de congelación es anterior o igual al umbral", () => {
  const umbral = "2026-09-17"
  const elementos = [
    { id: "a", nombre: "antes", fecha_congelacion: "2026-09-16" },
    { id: "b", nombre: "justo", fecha_congelacion: "2026-09-17" },
    { id: "c", nombre: "despues", fecha_congelacion: "2026-09-18" },
  ]
  assert.deepEqual(seleccionarElegibles(elementos, umbral).map((e) => e.id), ["a", "b"])
})

test("casos límite: sin fecha, con fecha futura o ilegible no son elegibles", () => {
  const elementos = [
    { id: "a", nombre: "sin fecha", fecha_congelacion: null },
    { id: "b", nombre: "indefinida", fecha_congelacion: undefined },
    { id: "c", nombre: "futura", fecha_congelacion: "2027-01-01" },
    { id: "d", nombre: "basura", fecha_congelacion: "no-es-fecha" },
    { id: "e", nombre: "imposible", fecha_congelacion: "2026-02-31" },
    { id: "f", nombre: "vacia", fecha_congelacion: "" },
    { id: "g", nombre: "valida", fecha_congelacion: "2026-01-10" },
  ]
  assert.deepEqual(seleccionarElegibles(elementos, "2026-09-17").map((e) => e.id), ["g"])
})

test("RF-3: los elegibles salen ordenados del más antiguo al más reciente y, a igual fecha, por nombre", () => {
  const elementos = [
    { id: "1", nombre: "perejil", fecha_congelacion: "2025-12-18" },
    { id: "2", nombre: "arroz", fecha_congelacion: "2025-12-18" },
    { id: "3", nombre: "pan", fecha_congelacion: "2025-06-01" },
  ]
  assert.deepEqual(seleccionarElegibles(elementos, "2026-09-17").map((e) => e.id), ["3", "2", "1"])
})

test("RF-3: no muta el inventario recibido", () => {
  const elementos = Object.freeze([Object.freeze({ id: "a", nombre: "x", fecha_congelacion: "2025-01-01" })])
  assert.doesNotThrow(() => seleccionarElegibles(elementos, "2026-09-17"))
})

test("RF-6: un elemento elegible sin aviso previo es nuevo y se avisa", () => {
  const elegibles = [{ id: "a", nombre: "x", fecha_congelacion: "2025-01-01" }]
  const decision = decidirAvisos({ elegibles, avisos: [], hoy, diasRecordatorio: 30 })
  assert.deepEqual(decision.aAvisar.map((e) => e.id), ["a"])
  assert.deepEqual(decision.nuevos.map((e) => e.id), ["a"])
  assert.deepEqual(decision.recordatorios, [])
})

test("RF-8: si todos fueron avisados y ningún recordatorio ha vencido, no hay nada que avisar", () => {
  const elegibles = [{ id: "a", nombre: "x", fecha_congelacion: "2025-01-01" }]
  const avisos = [{ elemento_id: "a", avisado_en: "2026-11-16T08:00:04Z" }]
  const decision = decidirAvisos({ elegibles, avisos, hoy, diasRecordatorio: 30 })
  assert.deepEqual(decision.aAvisar, [])
  assert.deepEqual(decision.yaAvisados.map((e) => e.id), ["a"])
})

test("RF-9: el recordatorio vence justo a los 30 días y no el día anterior", () => {
  const elegibles = [{ id: "a", nombre: "x", fecha_congelacion: "2025-01-01" }]
  // hoy = 2026-11-17. Aviso hace 29 días: aún no. Hace 30: sí. Hace 31: sí.
  const antes = decidirAvisos({ elegibles, avisos: [{ elemento_id: "a", avisado_en: "2026-10-19T08:00:00Z" }], hoy, diasRecordatorio: 30 })
  const justo = decidirAvisos({ elegibles, avisos: [{ elemento_id: "a", avisado_en: "2026-10-18T08:00:00Z" }], hoy, diasRecordatorio: 30 })
  const despues = decidirAvisos({ elegibles, avisos: [{ elemento_id: "a", avisado_en: "2026-10-17T08:00:00Z" }], hoy, diasRecordatorio: 30 })
  assert.deepEqual(antes.aAvisar, [])
  assert.deepEqual(justo.recordatorios.map((e) => e.id), ["a"])
  assert.deepEqual(despues.recordatorios.map((e) => e.id), ["a"])
})

test("RF-9: el vencimiento se mide en días naturales, no en horas exactas, para no retrasarse un día", () => {
  // El aviso se registró a las 08:00:05 y la siguiente ejecución llega a las
  // 08:00:02 de 30 días después: por horas serían 29 d 23 h 59 min 57 s.
  const elegibles = [{ id: "a", nombre: "x", fecha_congelacion: "2025-01-01" }]
  const avisos = [{ elemento_id: "a", avisado_en: "2026-10-18T08:00:05Z" }]
  const ejecucion = new Date("2026-11-17T08:00:02Z")
  const decision = decidirAvisos({ elegibles, avisos, hoy: ejecucion, diasRecordatorio: 30 })
  assert.deepEqual(decision.recordatorios.map((e) => e.id), ["a"])
})

test("RF-18: nuevos y recordatorios van en una lista única, ordenada como los elegibles", () => {
  const elegibles = [
    { id: "a", nombre: "a", fecha_congelacion: "2025-01-01" },
    { id: "b", nombre: "b", fecha_congelacion: "2025-02-01" },
    { id: "c", nombre: "c", fecha_congelacion: "2025-03-01" },
  ]
  const avisos = [{ elemento_id: "b", avisado_en: "2026-09-01T08:00:00Z" }]
  const decision = decidirAvisos({ elegibles, avisos, hoy, diasRecordatorio: 30 })
  assert.deepEqual(decision.aAvisar.map((e) => e.id), ["a", "b", "c"])
  assert.deepEqual(decision.nuevos.map((e) => e.id), ["a", "c"])
  assert.deepEqual(decision.recordatorios.map((e) => e.id), ["b"])
})

test("RF-19: al bajar el umbral, los nuevos elegibles se avisan y los ya avisados no se repiten", () => {
  const todos = [
    { id: "viejo", nombre: "viejo", fecha_congelacion: "2025-01-01" },
    { id: "reciente", nombre: "reciente", fecha_congelacion: "2026-10-10" },
  ]
  const avisos = [{ elemento_id: "viejo", avisado_en: "2026-11-16T08:00:00Z" }]
  const con2Meses = seleccionarElegibles(todos, calcularFechaUmbral(hoy, 2))
  const con1Mes = seleccionarElegibles(todos, calcularFechaUmbral(hoy, 1))
  // Con 2 meses solo es elegible "viejo", que ya fue avisado ayer: silencio.
  assert.deepEqual(con2Meses.map((e) => e.id), ["viejo"])
  assert.deepEqual(decidirAvisos({ elegibles: con2Meses, avisos, hoy, diasRecordatorio: 30 }).aAvisar, [])
  // Con 1 mes entra "reciente" como nuevo; "viejo" sigue sin repetirse.
  assert.deepEqual(con1Mes.map((e) => e.id), ["viejo", "reciente"])
  assert.deepEqual(decidirAvisos({ elegibles: con1Mes, avisos, hoy, diasRecordatorio: 30 }).aAvisar.map((e) => e.id), ["reciente"])
})

test("RF-9: un aviso con fecha ilegible no bloquea el aviso", () => {
  const elegibles = [{ id: "a", nombre: "x", fecha_congelacion: "2025-01-01" }]
  const decision = decidirAvisos({ elegibles, avisos: [{ elemento_id: "a", avisado_en: "basura" }], hoy, diasRecordatorio: 30 })
  assert.deepEqual(decision.aAvisar.map((e) => e.id), ["a"])
})

test("RF-10: los avisos de elementos que ya no son elegibles se marcan para descartar", () => {
  const elegibles = [{ id: "a", nombre: "x", fecha_congelacion: "2025-01-01" }]
  const avisos = [
    { elemento_id: "a", avisado_en: "2026-11-01T00:00:00Z" },
    { elemento_id: "b", avisado_en: "2026-11-01T00:00:00Z" },
  ]
  assert.deepEqual(avisosObsoletos(avisos, elegibles), ["b"])
  assert.deepEqual(avisosObsoletos([], elegibles), [])
  assert.deepEqual(avisosObsoletos(avisos, []), ["a", "b"])
})

test("RF-11: los destinatarios se normalizan, sin duplicados, vacíos ni espacios", () => {
  const { destinatarios, descartados } = normalizarDestinatarios(" Ana@Example.test , luis@example.test,,  ana@example.test ,   ")
  assert.deepEqual(destinatarios, ["ana@example.test", "luis@example.test"])
  assert.equal(descartados, 0)
})

test("RF-11: se descartan entradas que no parecen direcciones y se cuentan sin revelarlas", () => {
  const { destinatarios, descartados } = normalizarDestinatarios("ana@example.test, sin-arroba, @sin-usuario.test, dos@@example.test, a b@example.test")
  assert.deepEqual(destinatarios, ["ana@example.test"])
  assert.equal(descartados, 4)
})

test("RF-11: una lista ausente o vacía no produce destinatarios; no hay valor por defecto", () => {
  for (const vacio of [undefined, null, "", "   ", ",,,", []]) {
    assert.deepEqual(normalizarDestinatarios(vacio), { destinatarios: [], descartados: 0 }, `valor ${String(vacio)}`)
  }
})

test("RF-11: acepta también un array de direcciones", () => {
  assert.deepEqual(normalizarDestinatarios(["A@example.test", "a@example.test"]).destinatarios, ["a@example.test"])
})

test("RF-12: el módulo no contiene direcciones de correo escritas", () => {
  const codigo = require("node:fs").readFileSync(require.resolve("../../../lib/freezer/freezer-alerts-domain"), "utf8")
  const sinComentarios = codigo.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
  assert.doesNotMatch(sinComentarios, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
})

test("RF-13: el tiempo congelado se expresa en meses completos y días restantes", () => {
  assert.deepEqual(calcularTiempoCongelado("2025-12-18", hoy), { dias: 334, meses: 10, diasResto: 30 })
  assert.deepEqual(calcularTiempoCongelado("2026-09-17", hoy), { dias: 61, meses: 2, diasResto: 0 })
  assert.deepEqual(calcularTiempoCongelado("2026-11-17", hoy), { dias: 0, meses: 0, diasResto: 0 })
  assert.deepEqual(calcularTiempoCongelado("2026-11-10", hoy), { dias: 7, meses: 0, diasResto: 7 })
})

test("RF-13: sin fecha válida o con fecha futura el tiempo congelado es nulo", () => {
  for (const invalida of [null, undefined, "", "basura", "2026-02-31", "2030-01-01"]) {
    assert.equal(calcularTiempoCongelado(invalida, hoy), null, `valor ${String(invalida)}`)
  }
})

test("las funciones no leen el reloj global: mismo resultado con otro hoy inyectado", () => {
  const otro = new Date("2027-05-01T08:00:00Z")
  assert.equal(calcularFechaUmbral(otro, 2), "2027-03-01")
  assert.deepEqual(calcularTiempoCongelado("2027-03-01", otro), { dias: 61, meses: 2, diasResto: 0 })
})
