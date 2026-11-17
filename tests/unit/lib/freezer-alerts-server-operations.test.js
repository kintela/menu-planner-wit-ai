const test = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

const {
  leerConfiguracionAlertas,
  normalizarElemento,
  ejecutarAlertas,
} = require("../../../lib/freezer/freezer-alerts-server-operations")

// Spec 007 T6. Todas las dependencias (base de datos y correo) se inyectan:
// ningún test toca la red ni envía correo. Direcciones y credenciales ficticias.
const hoy = new Date("2026-11-17T08:00:00Z")
const PASSWORD_FICTICIA = "clave-ficticia-que-no-debe-aparecer-jamas"

const envCompleto = {
  FREEZER_ALERT_RECIPIENTS: "uno@example.test, dos@example.test",
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "587",
  SMTP_USER: "usuario-ficticio",
  SMTP_PASSWORD: PASSWORD_FICTICIA,
  SMTP_FROM_EMAIL: "avisos@example.test",
}

const fila = (id, nombre, fecha, extra = {}) => ({
  id,
  nombre,
  cantidad: 1,
  unidad: "ud",
  categoria: "Varios",
  estado: "fresco",
  fecha_congelacion: fecha,
  fecha_caducidad: null,
  cajon_id: "c1",
  cajones_congelador: { id: "c1", nombre: "Cajón 1", posicion: 1, congelador_id: "f1", congeladores: { id: "f1", usuario_id: "propietario-privado" } },
  ...extra,
})

// Imita la semántica atómica de la base de datos: un elemento nuevo se inserta
// solo si no existe, y un recordatorio se actualiza solo si su fecha sigue
// siendo la leída. No hay `await` dentro, igual que una sentencia atómica.
function crearAlmacen(iniciales = []) {
  const filas = new Map(iniciales.map((a) => [a.elemento_id, a.avisado_en]))
  return {
    filas,
    lista: () => Array.from(filas, ([elemento_id, avisado_en]) => ({ elemento_id, avisado_en })),
    reclamar({ nuevos, recordatorios }, instante) {
      const reclamados = []
      for (const id of nuevos) {
        if (!filas.has(id)) {
          filas.set(id, instante)
          reclamados.push(id)
        }
      }
      for (const { id, anterior } of recordatorios) {
        if (filas.get(id) === anterior) {
          filas.set(id, instante)
          reclamados.push(id)
        }
      }
      return reclamados
    },
    liberar({ nuevos, recordatorios }, instante) {
      for (const id of nuevos) if (filas.get(id) === instante) filas.delete(id)
      for (const { id, anterior } of recordatorios) if (filas.get(id) === instante) filas.set(id, anterior)
    },
  }
}

function crearDeps({ filas = [], avisos = [], almacen = crearAlmacen(avisos), congelador = "f1", falla = {}, retardo = false } = {}) {
  const llamadas = {
    resolverCongelador: 0,
    leerElementos: 0,
    leerAvisos: 0,
    reclamos: [],
    liberaciones: [],
    descartarAvisos: [],
    enviarCorreo: [],
    errores: [],
  }
  return {
    llamadas,
    almacen,
    resolverCongelador: async () => {
      llamadas.resolverCongelador += 1
      if (falla.resolverCongelador) throw new Error("detalle SQL interno")
      return congelador
    },
    leerElementos: async (fechaUmbral, congeladorId) => {
      llamadas.leerElementos += 1
      llamadas.fechaUmbral = fechaUmbral
      llamadas.congeladorConsultado = congeladorId
      if (falla.leerElementos) throw new Error("detalle SQL interno")
      return filas
    },
    leerAvisos: async () => {
      llamadas.leerAvisos += 1
      if (falla.leerAvisos) throw new Error("detalle SQL interno")
      const instantanea = almacen.lista()
      // Cede el turno para que una ejecución solapada lea antes de que esta reclame.
      if (retardo) await new Promise((resolver) => setImmediate(resolver))
      return instantanea
    },
    reclamarAvisos: async (reclamo, instante) => {
      llamadas.reclamos.push({ reclamo, instante })
      if (falla.reclamarAvisos) throw new Error("detalle SQL interno")
      return almacen.reclamar(reclamo, instante)
    },
    liberarAvisos: async (reclamo, instante) => {
      llamadas.liberaciones.push({ reclamo, instante })
      if (falla.liberarAvisos) throw new Error("detalle SQL interno")
      almacen.liberar(reclamo, instante)
    },
    descartarAvisos: async (ids) => {
      llamadas.descartarAvisos.push(ids)
      if (falla.descartarAvisos) throw new Error("detalle SQL interno")
    },
    enviarCorreo: async (mensaje) => {
      llamadas.enviarCorreo.push(mensaje)
      if (falla.enviarCorreo) throw new Error(`fallo SMTP con ${PASSWORD_FICTICIA}`)
    },
    registrarError: (contexto, error) => llamadas.errores.push({ contexto, error }),
  }
}

const ejecutar = (deps, { env = envCompleto, modo = { dryRun: false, testEmail: false } } = {}) =>
  ejecutarAlertas({ config: leerConfiguracionAlertas(env), modo, hoy, baseUrl: "https://app.example.test", deps })

// ---------- configuración ----------

test("RF-4/RF-9 bis/RF-12: sin variables hay umbral de 2 meses, recordatorio de 30 días y ningún destinatario", () => {
  const config = leerConfiguracionAlertas({})
  assert.equal(config.meses, 2)
  assert.equal(config.diasRecordatorio, 30)
  assert.deepEqual(config.destinatarios, [])
  assert.deepEqual(config.smtpFaltantes, ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"])
})

test("la configuración lee umbral, recordatorio y destinatarios normalizados", () => {
  const config = leerConfiguracionAlertas({ ...envCompleto, FREEZER_ALERT_MONTHS: "3", FREEZER_ALERT_REMINDER_DAYS: "45", FREEZER_ALERT_RECIPIENTS: " A@example.test ,a@example.test, malo " })
  assert.equal(config.meses, 3)
  assert.equal(config.diasRecordatorio, 45)
  assert.deepEqual(config.destinatarios, ["a@example.test"])
  assert.equal(config.destinatariosDescartados, 1)
})

test("RF-15: el puerto inválido cae a 587, 465 es seguro y el remitente cae al usuario", () => {
  assert.equal(leerConfiguracionAlertas({ ...envCompleto, SMTP_PORT: "x" }).smtp.port, 587)
  assert.equal(leerConfiguracionAlertas({ ...envCompleto, SMTP_PORT: "465" }).smtp.secure, true)
  assert.equal(leerConfiguracionAlertas({ ...envCompleto, SMTP_PORT: "587" }).smtp.secure, false)
  const sinFrom = leerConfiguracionAlertas({ ...envCompleto, SMTP_FROM_EMAIL: "" })
  assert.equal(sinFrom.smtp.from, "usuario-ficticio")
  assert.deepEqual(sinFrom.smtpFaltantes, [])
})

test("RF-15: smtpFaltantes lista nombres de variables, nunca valores", () => {
  const config = leerConfiguracionAlertas({ SMTP_HOST: "smtp.example.test", SMTP_PASSWORD: PASSWORD_FICTICIA })
  assert.deepEqual(config.smtpFaltantes, ["SMTP_USER", "SMTP_FROM_EMAIL"])
  assert.doesNotMatch(JSON.stringify(config.smtpFaltantes), new RegExp(PASSWORD_FICTICIA))
})

// ---------- normalización ----------

test("el elemento normalizado conserva lo que consume /admin y no expone el propietario", () => {
  const e = normalizarElemento(fila("a", "x", "2025-01-01"))
  assert.deepEqual(Object.keys(e).sort(), ["cajon", "cantidad", "categoria", "estado", "fecha_caducidad", "fecha_congelacion", "id", "nombre", "unidad"])
  assert.deepEqual(e.cajon, { id: "c1", nombre: "Cajón 1", posicion: 1, congelador_id: "f1" })
  assert.doesNotMatch(JSON.stringify(e), /propietario-privado|usuario_id/)
})

test("la normalización acepta la relación como objeto o como array y tolera su ausencia", () => {
  assert.equal(normalizarElemento(fila("a", "x", "2025-01-01", { cajones_congelador: [{ id: "c9", nombre: "N", posicion: 2, congelador_id: "f" }] })).cajon.id, "c9")
  assert.equal(normalizarElemento(fila("a", "x", "2025-01-01", { cajones_congelador: null })).cajon, null)
})

// ---------- RF-11: destinatarios ----------

test("RF-11: sin destinatarios no se consulta nada ni se envía, y se señala qué configurar", async () => {
  const deps = crearDeps({ filas: [fila("a", "x", "2025-01-01")] })
  const r = await ejecutar(deps, { env: { ...envCompleto, FREEZER_ALERT_RECIPIENTS: "" } })
  assert.equal(r.estadoHttp, 500)
  assert.equal(r.cuerpo.ok, false)
  assert.equal(r.cuerpo.resultado, "fallo")
  assert.match(r.cuerpo.error, /FREEZER_ALERT_RECIPIENTS/)
  assert.equal(deps.llamadas.leerElementos, 0)
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
})

// ---------- RF-6/RF-7: primer aviso ----------

test("RF-6/RF-7: con elementos elegibles nuevos reclama, envía un único correo agrupado y deja el aviso registrado", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01"), fila("b", "Arroz", "2025-02-01")] })
  const r = await ejecutar(deps)
  assert.equal(r.estadoHttp, 200)
  assert.equal(r.cuerpo.ok, true)
  assert.equal(r.cuerpo.sent, true)
  assert.equal(r.cuerpo.resultado, "aviso_enviado")
  assert.equal(deps.llamadas.enviarCorreo.length, 1, "un único correo para todos los elementos")
  const correo = deps.llamadas.enviarCorreo[0]
  assert.equal(correo.to, "uno@example.test, dos@example.test")
  assert.match(correo.subject, /^\[Congelador\] 2 elementos con 2\+ meses$/)
  assert.match(correo.text, /Pan/)
  assert.match(correo.text, /Arroz/)
  assert.deepEqual(deps.llamadas.reclamos, [{ reclamo: { nuevos: ["a", "b"], recordatorios: [] }, instante: "2026-11-17T08:00:00.000Z" }])
  assert.deepEqual(deps.almacen.lista().map((a) => a.elemento_id).sort(), ["a", "b"])
  assert.equal(r.cuerpo.avisosRegistrados, true)
})

test("el umbral se calcula con el reloj inyectado y se pasa a la consulta", async () => {
  const deps = crearDeps()
  await ejecutar(deps)
  assert.equal(deps.llamadas.fechaUmbral, "2026-09-17")
})

test("contrato de /admin: la respuesta de éxito trae ok, sent, message, eligibleItems, thresholdDate e items", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")] })
  const { cuerpo } = await ejecutar(deps)
  for (const clave of ["ok", "sent", "message", "eligibleItems", "thresholdDate", "items", "checkedAt", "alertMonths", "dryRun", "recipients"]) {
    assert.ok(clave in cuerpo, `falta «${clave}»`)
  }
  assert.equal(cuerpo.eligibleItems, 1)
  assert.equal(cuerpo.thresholdDate, "2026-09-17")
  assert.equal(cuerpo.items[0].nombre, "Pan")
  assert.doesNotMatch(JSON.stringify(cuerpo), /propietario-privado|usuario_id/)
})

test("la consulta puede devolver filas no elegibles: se descartan igualmente (fecha futura, ilegible o ausente)", async () => {
  const deps = crearDeps({ filas: [fila("a", "Futuro", "2027-01-01"), fila("b", "Basura", "no-es-fecha"), fila("c", "Sin fecha", null), fila("d", "Bueno", "2025-01-01")] })
  const r = await ejecutar(deps)
  assert.deepEqual(r.cuerpo.items.map((i) => i.id), ["d"])
  assert.equal(r.cuerpo.eligibleItems, 1)
})

// ---------- RF-8/RF-9: silencio y recordatorio ----------

test("RF-8: sin elementos elegibles no se envía nada y se indica que no hay novedades", async () => {
  const deps = crearDeps({ filas: [] })
  const r = await ejecutar(deps)
  assert.equal(r.estadoHttp, 200)
  assert.equal(r.cuerpo.ok, true)
  assert.equal(r.cuerpo.sent, false)
  assert.equal(r.cuerpo.resultado, "sin_novedades")
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
  assert.equal(deps.llamadas.reclamos.length, 0)
})

test("RF-8: si todo lo elegible ya fue avisado no se envía y el mensaje lo explica", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], avisos: [{ elemento_id: "a", avisado_en: "2026-11-16T08:00:04Z" }] })
  const r = await ejecutar(deps)
  assert.equal(r.cuerpo.resultado, "sin_novedades")
  assert.equal(r.cuerpo.sent, false)
  assert.match(r.cuerpo.message, /ya fueron avisados/)
  assert.equal(r.cuerpo.eligibleItems, 1)
  assert.deepEqual(r.cuerpo.items, [])
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
})

test("RF-9: un recordatorio vencido se reclama con su fecha anterior y se actualiza junto con los nuevos", async () => {
  const deps = crearDeps({
    filas: [fila("viejo", "Viejo", "2025-01-01"), fila("nuevo", "Nuevo", "2025-03-01")],
    avisos: [{ elemento_id: "viejo", avisado_en: "2026-10-10T08:00:00Z" }],
  })
  const r = await ejecutar(deps)
  assert.equal(r.cuerpo.resultado, "aviso_enviado")
  assert.deepEqual(deps.llamadas.reclamos[0].reclamo, { nuevos: ["nuevo"], recordatorios: [{ id: "viejo", anterior: "2026-10-10T08:00:00Z" }] })
  assert.equal(deps.almacen.filas.get("viejo"), "2026-11-17T08:00:00.000Z")
  assert.equal(r.cuerpo.nuevos, 1)
  assert.equal(r.cuerpo.recordatorios, 1)
})

test("RF-9 bis: el periodo de recordatorio configurable se respeta", async () => {
  const filas = [fila("a", "Pan", "2025-01-01")]
  const avisos = [{ elemento_id: "a", avisado_en: "2026-11-02T08:00:00Z" }] // hace 15 días
  assert.equal((await ejecutar(crearDeps({ filas, avisos }))).cuerpo.resultado, "sin_novedades")
  assert.equal((await ejecutar(crearDeps({ filas, avisos }), { env: { ...envCompleto, FREEZER_ALERT_REMINDER_DAYS: "10" } })).cuerpo.resultado, "aviso_enviado")
})

// ---------- RF-10: descarte de avisos obsoletos ----------

test("RF-10: tras un envío correcto se descartan los avisos de elementos que ya no son elegibles", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], avisos: [{ elemento_id: "gone", avisado_en: "2026-10-01T00:00:00Z" }] })
  await ejecutar(deps)
  assert.deepEqual(deps.llamadas.descartarAvisos, [["gone"]])
})

test("RF-10: también se descartan cuando no hay nada que avisar, pero no en una comprobación", async () => {
  const avisos = [{ elemento_id: "gone", avisado_en: "2026-10-01T00:00:00Z" }]
  const real = crearDeps({ filas: [], avisos })
  await ejecutar(real)
  assert.deepEqual(real.llamadas.descartarAvisos, [["gone"]])
  const prueba = crearDeps({ filas: [], avisos })
  await ejecutar(prueba, { modo: { dryRun: true, testEmail: false } })
  assert.deepEqual(prueba.llamadas.descartarAvisos, [])
})

// ---------- RF-14: fallo de envío ----------

test("RF-14: si el envío falla se liberan los avisos reclamados, se deja constancia y no se filtran credenciales", async () => {
  const inicial = [{ elemento_id: "viejo", avisado_en: "2026-10-10T08:00:00Z" }, { elemento_id: "gone", avisado_en: "2026-10-01T00:00:00Z" }]
  const deps = crearDeps({ filas: [fila("viejo", "Viejo", "2025-01-01"), fila("nuevo", "Nuevo", "2025-03-01")], avisos: inicial, falla: { enviarCorreo: true } })
  const r = await ejecutar(deps)
  assert.equal(r.estadoHttp, 500)
  assert.equal(r.cuerpo.ok, false)
  assert.equal(r.cuerpo.sent, false)
  assert.equal(r.cuerpo.resultado, "fallo")
  // El registro queda exactamente como estaba: lo nuevo no consta y el recordatorio conserva su fecha.
  assert.deepEqual(deps.almacen.lista(), inicial)
  assert.equal(deps.llamadas.liberaciones.length, 1)
  assert.equal(deps.llamadas.descartarAvisos.length, 0, "no altera el estado en un fallo")
  assert.equal(deps.llamadas.errores.length, 1, "deja constancia para diagnóstico")
  assert.equal(deps.llamadas.errores[0].contexto, "envio")
  assert.doesNotMatch(JSON.stringify(r.cuerpo), new RegExp(PASSWORD_FICTICIA))
  assert.doesNotMatch(JSON.stringify(r.cuerpo), /smtp\.example\.test|usuario-ficticio/)
})

test("tras un fallo, la ejecución siguiente vuelve a avisar de los mismos elementos", async () => {
  const filas = [fila("a", "Pan", "2025-01-01")]
  const almacen = crearAlmacen()
  const fallida = crearDeps({ filas, almacen, falla: { enviarCorreo: true } })
  await ejecutar(fallida)
  assert.equal(almacen.filas.size, 0)
  const siguiente = crearDeps({ filas, almacen })
  assert.equal((await ejecutar(siguiente)).cuerpo.resultado, "aviso_enviado")
})

test("si no se puede reclamar el aviso no se envía nada: se prefiere fallar a arriesgar un duplicado", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], falla: { reclamarAvisos: true } })
  const r = await ejecutar(deps)
  assert.equal(r.estadoHttp, 500)
  assert.equal(r.cuerpo.ok, false)
  assert.equal(r.cuerpo.sent, false)
  assert.equal(r.cuerpo.resultado, "fallo")
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
  assert.equal(deps.llamadas.liberaciones.length, 0)
  assert.equal(deps.llamadas.errores[0].contexto, "registro")
  assert.doesNotMatch(JSON.stringify(r.cuerpo), /detalle SQL interno/)
})

test("un fallo al leer el inventario o los avisos devuelve un error genérico sin detalles SQL y no envía", async () => {
  for (const falla of [{ leerElementos: true }, { leerAvisos: true }]) {
    const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], falla })
    const r = await ejecutar(deps)
    assert.equal(r.estadoHttp, 500)
    assert.equal(r.cuerpo.resultado, "fallo")
    assert.doesNotMatch(JSON.stringify(r.cuerpo), /detalle SQL interno/)
    assert.equal(deps.llamadas.enviarCorreo.length, 0)
  }
})

// ---------- RF-15: configuración de correo incompleta ----------

test("RF-15: con la configuración de correo incompleta no se intenta el envío y se nombran las variables que faltan", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")] })
  const r = await ejecutar(deps, { env: { FREEZER_ALERT_RECIPIENTS: "uno@example.test", SMTP_HOST: "smtp.example.test", SMTP_PASSWORD: PASSWORD_FICTICIA } })
  assert.equal(r.estadoHttp, 500)
  assert.equal(r.cuerpo.resultado, "fallo")
  assert.match(r.cuerpo.error, /SMTP_USER/)
  assert.match(r.cuerpo.error, /SMTP_FROM_EMAIL/)
  assert.doesNotMatch(r.cuerpo.error, /SMTP_HOST/, "solo lo que falta")
  assert.doesNotMatch(JSON.stringify(r.cuerpo), new RegExp(PASSWORD_FICTICIA))
  assert.doesNotMatch(JSON.stringify(r.cuerpo), /smtp\.example\.test/)
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
  assert.equal(deps.llamadas.reclamos.length, 0)
})

// ---------- RF-16: comprobación sin envío ----------

test("RF-16: una comprobación calcula los elementos pero no envía, no registra y no descarta", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], avisos: [{ elemento_id: "gone", avisado_en: "2026-10-01T00:00:00Z" }] })
  const r = await ejecutar(deps, { modo: { dryRun: true, testEmail: false } })
  assert.equal(r.estadoHttp, 200)
  assert.equal(r.cuerpo.ok, true)
  assert.equal(r.cuerpo.sent, false)
  assert.equal(r.cuerpo.dryRun, true)
  assert.equal(r.cuerpo.resultado, "comprobacion")
  assert.deepEqual(r.cuerpo.items.map((i) => i.id), ["a"])
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
  assert.equal(deps.llamadas.reclamos.length, 0)
  assert.equal(deps.llamadas.descartarAvisos.length, 0)
})

test("RF-16: la comprobación no exige tener el correo configurado", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")] })
  const r = await ejecutar(deps, { env: { FREEZER_ALERT_RECIPIENTS: "uno@example.test" }, modo: { dryRun: true, testEmail: false } })
  assert.equal(r.estadoHttp, 200)
  assert.equal(r.cuerpo.resultado, "comprobacion")
})

// ---------- correo de prueba (/admin) ----------

test("el correo de prueba se envía sin consultar el inventario ni registrar avisos", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")] })
  const r = await ejecutar(deps, { modo: { dryRun: false, testEmail: true } })
  assert.equal(r.estadoHttp, 200)
  assert.equal(r.cuerpo.sent, true)
  assert.equal(r.cuerpo.resultado, "prueba_enviada")
  assert.equal(deps.llamadas.leerElementos, 0)
  assert.equal(deps.llamadas.reclamos.length, 0)
  assert.equal(deps.llamadas.enviarCorreo[0].subject, "[Congelador] Correo de prueba")
})

test("el correo de prueba en modo comprobación no envía, y sin configuración de correo falla con los nombres que faltan", async () => {
  const seco = crearDeps()
  const a = await ejecutar(seco, { modo: { dryRun: true, testEmail: true } })
  assert.equal(a.cuerpo.sent, false)
  assert.equal(seco.llamadas.enviarCorreo.length, 0)

  const incompleto = crearDeps()
  const b = await ejecutar(incompleto, { env: { FREEZER_ALERT_RECIPIENTS: "uno@example.test" }, modo: { dryRun: false, testEmail: true } })
  assert.equal(b.estadoHttp, 500)
  assert.match(b.cuerpo.error, /SMTP_HOST/)
})

test("un fallo al enviar el correo de prueba da error genérico sin credenciales", async () => {
  const deps = crearDeps({ falla: { enviarCorreo: true } })
  const r = await ejecutar(deps, { modo: { dryRun: false, testEmail: true } })
  assert.equal(r.estadoHttp, 500)
  assert.doesNotMatch(JSON.stringify(r.cuerpo), new RegExp(PASSWORD_FICTICIA))
})

// ---------- RF-12 y reloj ----------

test("RF-12: el módulo no contiene direcciones de correo escritas", () => {
  const codigo = readFileSync(resolve(__dirname, "../../../lib/freezer/freezer-alerts-server-operations.js"), "utf8")
  const sinComentarios = codigo.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
  assert.doesNotMatch(sinComentarios, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
})

test("el momento del aviso sale del reloj inyectado", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")] })
  await ejecutarAlertas({ config: leerConfiguracionAlertas(envCompleto), modo: { dryRun: false, testEmail: false }, hoy: new Date("2030-05-05T10:00:00Z"), baseUrl: "", deps })
  assert.equal(deps.llamadas.reclamos[0].instante, "2030-05-05T10:00:00.000Z")
})


// ---------- T7: alcance del congelador único (RF-5) ----------

test("RF-5: el inventario se consulta limitado al congelador único resuelto antes", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], congelador: "f-unico" })
  await ejecutar(deps)
  assert.equal(deps.llamadas.resolverCongelador, 1)
  assert.equal(deps.llamadas.congeladorConsultado, "f-unico")
})

test("RF-5: sin congelador se termina sin avisar y sin error, y no se consulta el inventario", async () => {
  for (const modo of [{ dryRun: false, testEmail: false }, { dryRun: true, testEmail: false }]) {
    const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], congelador: null })
    const r = await ejecutar(deps, { modo })
    assert.equal(r.estadoHttp, 200)
    assert.equal(r.cuerpo.ok, true)
    assert.equal(r.cuerpo.sent, false)
    assert.equal(r.cuerpo.resultado, "sin_novedades")
    assert.equal(r.cuerpo.eligibleItems, 0)
    assert.deepEqual(r.cuerpo.items, [])
    assert.match(r.cuerpo.message, /No existe ningún congelador/)
    assert.equal(deps.llamadas.leerElementos, 0)
    assert.equal(deps.llamadas.enviarCorreo.length, 0)
    assert.equal(deps.llamadas.reclamos.length, 0)
  }
})

test("RF-5: un congelador sin cajones, o con cajones sin elementos, no genera aviso ni error", async () => {
  // En ambos casos la consulta limitada al congelador devuelve cero filas.
  const deps = crearDeps({ filas: [], congelador: "f-vacio" })
  const r = await ejecutar(deps)
  assert.equal(r.estadoHttp, 200)
  assert.equal(r.cuerpo.ok, true)
  assert.equal(r.cuerpo.resultado, "sin_novedades")
  assert.equal(r.cuerpo.eligibleItems, 0)
  assert.match(r.cuerpo.message, /Sin elementos que superen el umbral/)
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
})

test("RF-5: si no se puede determinar el congelador único (error o ambigüedad) se falla sin enviar y sin detalles", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], falla: { resolverCongelador: true } })
  const r = await ejecutar(deps)
  assert.equal(r.estadoHttp, 500)
  assert.equal(r.cuerpo.resultado, "fallo")
  assert.doesNotMatch(JSON.stringify(r.cuerpo), /detalle SQL interno/)
  assert.equal(deps.llamadas.leerElementos, 0)
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
  assert.equal(deps.llamadas.errores[0].contexto, "lectura")
})

test("el correo de prueba no necesita el congelador: no lo consulta", async () => {
  const deps = crearDeps({ congelador: null })
  const r = await ejecutar(deps, { modo: { dryRun: false, testEmail: true } })
  assert.equal(r.cuerpo.resultado, "prueba_enviada")
  assert.equal(deps.llamadas.resolverCongelador, 0)
})

// ---------- T7: ejecuciones solapadas ----------

test("concurrencia: dos ejecuciones solapadas no envían los mismos elementos dos veces", async () => {
  const filas = [fila("a", "Pan", "2025-01-01"), fila("b", "Arroz", "2025-02-01"), fila("c", "Perejil", "2025-03-01")]
  const almacen = crearAlmacen()
  const una = crearDeps({ filas, almacen, retardo: true })
  const otra = crearDeps({ filas, almacen, retardo: true })

  const [r1, r2] = await Promise.all([ejecutar(una), ejecutar(otra)])

  const enviados = una.llamadas.enviarCorreo.length + otra.llamadas.enviarCorreo.length
  assert.equal(enviados, 1, "exactamente un correo")
  assert.deepEqual([r1.cuerpo.resultado, r2.cuerpo.resultado].sort(), ["aviso_enviado", "sin_novedades"])
  const correo = [...una.llamadas.enviarCorreo, ...otra.llamadas.enviarCorreo][0]
  for (const nombre of ["Pan", "Arroz", "Perejil"]) {
    assert.equal(correo.text.split(nombre).length - 1, 1, `«${nombre}» aparece una sola vez`)
  }
  assert.deepEqual(almacen.lista().map((a) => a.elemento_id).sort(), ["a", "b", "c"])
})

test("concurrencia: la ejecución que pierde la carrera lo explica y no envía ni libera nada", async () => {
  const filas = [fila("a", "Pan", "2025-01-01")]
  const almacen = crearAlmacen()
  const ganadora = crearDeps({ filas, almacen, retardo: true })
  const perdedora = crearDeps({ filas, almacen, retardo: true })
  const [r1, r2] = await Promise.all([ejecutar(ganadora), ejecutar(perdedora)])
  const perdio = r1.cuerpo.resultado === "sin_novedades" ? r1 : r2
  assert.equal(perdio.estadoHttp, 200)
  assert.equal(perdio.cuerpo.sent, false)
  assert.deepEqual(perdio.cuerpo.items, [])
  assert.match(perdio.cuerpo.message, /otra ejecución/)
  const deps = r1.cuerpo.resultado === "sin_novedades" ? ganadora : perdedora
  assert.equal(deps.llamadas.enviarCorreo.length, 0)
  assert.equal(deps.llamadas.liberaciones.length, 0)
})

test("concurrencia: un recordatorio vencido solo lo gana una de las ejecuciones solapadas", async () => {
  const filas = [fila("viejo", "Viejo", "2025-01-01")]
  const almacen = crearAlmacen([{ elemento_id: "viejo", avisado_en: "2026-10-10T08:00:00Z" }])
  const una = crearDeps({ filas, almacen, retardo: true })
  const otra = crearDeps({ filas, almacen, retardo: true })
  await Promise.all([ejecutar(una), ejecutar(otra)])
  assert.equal(una.llamadas.enviarCorreo.length + otra.llamadas.enviarCorreo.length, 1)
})

test("concurrencia: si otra ejecución se adelanta con parte de los elementos, solo se envía el resto", async () => {
  const filas = [fila("a", "Pan", "2025-01-01"), fila("b", "Arroz", "2025-02-01")]
  const almacen = crearAlmacen()
  const deps = crearDeps({ filas, almacen })
  const leer = deps.leerAvisos
  // Tras esta ejecución leer el registro, una rival reclama "b" por su cuenta.
  deps.leerAvisos = async () => {
    const instantanea = await leer()
    almacen.filas.set("b", "2026-11-17T07:59:59.000Z")
    return instantanea
  }
  const r = await ejecutar(deps)
  assert.equal(r.cuerpo.resultado, "aviso_enviado")
  assert.deepEqual(r.cuerpo.items.map((i) => i.id), ["a"])
  assert.equal(deps.llamadas.enviarCorreo.length, 1)
  assert.match(deps.llamadas.enviarCorreo[0].text, /Pan/)
  assert.doesNotMatch(deps.llamadas.enviarCorreo[0].text, /Arroz/)
  assert.equal(almacen.filas.get("b"), "2026-11-17T07:59:59.000Z", "el reclamo ajeno no se toca")
})

test("concurrencia: si el envío falla solo se liberan los avisos propios, no los de una rival", async () => {
  const filas = [fila("a", "Pan", "2025-01-01"), fila("b", "Arroz", "2025-02-01")]
  const almacen = crearAlmacen()
  const deps = crearDeps({ filas, almacen, falla: { enviarCorreo: true } })
  const leer = deps.leerAvisos
  deps.leerAvisos = async () => {
    const instantanea = await leer()
    almacen.filas.set("b", "2026-11-17T07:59:59.000Z")
    return instantanea
  }
  await ejecutar(deps)
  assert.equal(almacen.filas.has("a"), false, "lo propio se libera")
  assert.equal(almacen.filas.get("b"), "2026-11-17T07:59:59.000Z", "lo ajeno se conserva")
  assert.deepEqual(deps.llamadas.liberaciones[0].reclamo, { nuevos: ["a"], recordatorios: [] })
})

test("si el envío falla y además no se pueden liberar los avisos, se informa del fallo y se deja constancia del registro", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")], falla: { enviarCorreo: true, liberarAvisos: true } })
  const r = await ejecutar(deps)
  assert.equal(r.estadoHttp, 500)
  assert.equal(r.cuerpo.resultado, "fallo")
  assert.deepEqual(deps.llamadas.errores.map((e) => e.contexto), ["envio", "registro"])
  assert.doesNotMatch(JSON.stringify(r.cuerpo), /detalle SQL interno|clave-ficticia/)
})

test("una comprobación no reclama nada aunque haya elementos pendientes", async () => {
  const deps = crearDeps({ filas: [fila("a", "Pan", "2025-01-01")] })
  await ejecutar(deps, { modo: { dryRun: true, testEmail: false } })
  assert.equal(deps.llamadas.reclamos.length, 0)
  assert.equal(deps.almacen.filas.size, 0)
})
