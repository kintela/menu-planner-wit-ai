// Operaciones de servidor de las alertas del congelador (Spec 007, T6).
// Orquesta configuración, decisión, envío y registro con TODAS sus dependencias
// inyectadas (base de datos y correo), de modo que se prueba sin red. No importa
// Next ni Supabase, no lee el reloj global y nunca devuelve ni registra
// credenciales ni detalles internos de los proveedores.

const {
  parseMesesUmbral,
  parseDiasRecordatorio,
  calcularFechaUmbral,
  seleccionarElegibles,
  decidirAvisos,
  avisosObsoletos,
  normalizarDestinatarios,
} = require("./freezer-alerts-domain")
const { construirCorreoAviso, construirCorreoPrueba } = require("./freezer-alerts-presentation")

const PUERTO_SMTP_POR_DEFECTO = 587

// RF-4, RF-9 bis, RF-11, RF-12, RF-15. `env` es un objeto tipo process.env.
function leerConfiguracionAlertas(env) {
  const { destinatarios, descartados } = normalizarDestinatarios(env.FREEZER_ALERT_RECIPIENTS)

  const puertoLeido = Number(env.SMTP_PORT ?? PUERTO_SMTP_POR_DEFECTO)
  const puerto = Number.isInteger(puertoLeido) && puertoLeido > 0 ? puertoLeido : PUERTO_SMTP_POR_DEFECTO
  const usuario = env.SMTP_USER || ""
  const smtp = {
    host: env.SMTP_HOST || "",
    port: puerto,
    secure: puerto === 465,
    user: usuario,
    password: env.SMTP_PASSWORD || "",
    from: env.SMTP_FROM_EMAIL || usuario,
  }

  // Solo nombres de variables: nunca sus valores.
  const smtpFaltantes = []
  if (!smtp.host) smtpFaltantes.push("SMTP_HOST")
  if (!smtp.user) smtpFaltantes.push("SMTP_USER")
  if (!smtp.password) smtpFaltantes.push("SMTP_PASSWORD")
  if (!smtp.from) smtpFaltantes.push("SMTP_FROM_EMAIL")

  return {
    meses: parseMesesUmbral(env.FREEZER_ALERT_MONTHS),
    diasRecordatorio: parseDiasRecordatorio(env.FREEZER_ALERT_REMINDER_DAYS),
    destinatarios,
    destinatariosDescartados: descartados,
    smtp,
    smtpFaltantes,
  }
}

// Convierte una fila de la base de datos en el elemento que consume /admin. No
// expone el propietario del congelador. La relación puede llegar como objeto o
// como array según cómo la infiera el cliente.
function normalizarElemento(fila) {
  const relacion = Array.isArray(fila.cajones_congelador) ? fila.cajones_congelador[0] : fila.cajones_congelador
  return {
    id: fila.id,
    nombre: fila.nombre,
    cantidad: fila.cantidad ?? null,
    unidad: fila.unidad ?? null,
    categoria: fila.categoria ?? null,
    estado: fila.estado ?? null,
    fecha_congelacion: fila.fecha_congelacion ?? null,
    fecha_caducidad: fila.fecha_caducidad ?? null,
    cajon: relacion
      ? {
          id: relacion.id ?? null,
          nombre: relacion.nombre ?? null,
          posicion: relacion.posicion ?? null,
          congelador_id: relacion.congelador_id ?? null,
        }
      : null,
  }
}

async function intentar(accion, deps, contexto) {
  try {
    await accion()
    return true
  } catch (error) {
    deps.registrarError?.(contexto, error)
    return false
  }
}

// Reclamo de avisos (T7). Para que dos ejecuciones solapadas no envíen lo mismo,
// los elementos se RECLAMAN antes de enviar y se LIBERAN si el envío falla:
//   - un elemento nuevo se reclama insertándolo solo si no existe;
//   - un recordatorio se reclama actualizando solo si su fecha sigue siendo la
//     que se leyó (`anterior`).
// `deps.reclamarAvisos` devuelve los identificadores realmente ganados.
function construirReclamo(decision, avisos) {
  const anteriores = new Map(avisos.map((a) => [a.elemento_id, a.avisado_en]))
  return {
    nuevos: decision.nuevos.map((e) => e.id),
    recordatorios: decision.recordatorios.map((e) => ({ id: e.id, anterior: anteriores.get(e.id) })),
  }
}

function reclamoDe(reclamo, ganados) {
  const propios = new Set(ganados)
  return {
    nuevos: reclamo.nuevos.filter((id) => propios.has(id)),
    recordatorios: reclamo.recordatorios.filter((r) => propios.has(r.id)),
  }
}

// Devuelve { estadoHttp, cuerpo }. El cuerpo conserva los campos que consume la
// página de administración (ok, sent, message, error, eligibleItems,
// thresholdDate, items) y añade `resultado`: "sin_novedades", "aviso_enviado" o
// "fallo" (y "comprobacion" / "prueba_enviada" para los modos manuales).
async function ejecutarAlertas({ config, modo, hoy, baseUrl, deps }) {
  const fechaUmbral = calcularFechaUmbral(hoy, config.meses)
  const base = {
    ok: true,
    checkedAt: hoy.toISOString(),
    thresholdDate: fechaUmbral,
    alertMonths: config.meses,
    sent: false,
    dryRun: modo.dryRun,
    recipients: config.destinatarios,
    items: [],
  }
  const fallo = (error, extra = {}) => ({
    estadoHttp: 500,
    cuerpo: { ...base, ...extra, ok: false, sent: false, resultado: "fallo", error },
  })
  const faltaCorreo = (extra) =>
    fallo(`Configuración de correo incompleta. Faltan: ${config.smtpFaltantes.join(", ")}.`, extra)

  if (config.destinatarios.length === 0) {
    const aviso =
      config.destinatariosDescartados > 0
        ? ` Se descartaron ${config.destinatariosDescartados} entradas que no parecen direcciones.`
        : ""
    return fallo(`No hay destinatarios configurados. Define FREEZER_ALERT_RECIPIENTS.${aviso}`)
  }

  const enviar = (correo) =>
    deps.enviarCorreo({ ...correo, to: config.destinatarios.join(", "), smtp: config.smtp })

  if (modo.testEmail) {
    if (modo.dryRun) {
      return { estadoHttp: 200, cuerpo: { ...base, resultado: "comprobacion", message: "Prueba preparada (sin envío)." } }
    }
    if (config.smtpFaltantes.length > 0) return faltaCorreo()
    const enviado = await intentar(() => enviar(construirCorreoPrueba({ hoy, baseUrl })), deps, "envio")
    if (!enviado) return fallo("No se pudo enviar el correo de prueba.")
    return {
      estadoHttp: 200,
      cuerpo: { ...base, sent: true, resultado: "prueba_enviada", message: "Correo de prueba enviado correctamente." },
    }
  }

  // RF-5: solo se revisa el congelador único definido por la Spec 005.
  let congeladorId
  try {
    congeladorId = await deps.resolverCongelador()
  } catch (error) {
    deps.registrarError?.("lectura", error)
    return fallo("No se pudo determinar el congelador.")
  }
  if (congeladorId === null) {
    return {
      estadoHttp: 200,
      cuerpo: { ...base, totalItems: 0, eligibleItems: 0, resultado: "sin_novedades", message: "No existe ningún congelador." },
    }
  }

  let filas
  try {
    filas = await deps.leerElementos(fechaUmbral, congeladorId)
  } catch (error) {
    deps.registrarError?.("lectura", error)
    return fallo("No se pudieron obtener los elementos del congelador.")
  }

  let avisos
  try {
    avisos = await deps.leerAvisos()
  } catch (error) {
    deps.registrarError?.("lectura", error)
    return fallo("No se pudo consultar el registro de avisos.")
  }

  // La consulta ya filtra, pero la elegibilidad es una regla de dominio.
  const elegibles = seleccionarElegibles(filas.map(normalizarElemento), fechaUmbral)
  const decision = decidirAvisos({ elegibles, avisos, hoy, diasRecordatorio: config.diasRecordatorio })
  const obsoletos = avisosObsoletos(avisos, elegibles)
  const resumen = {
    ...base,
    totalItems: elegibles.length,
    eligibleItems: elegibles.length,
    nuevos: decision.nuevos.length,
    recordatorios: decision.recordatorios.length,
    items: decision.aAvisar,
  }

  const limpiarObsoletos = async () => {
    if (obsoletos.length > 0) await intentar(() => deps.descartarAvisos(obsoletos), deps, "registro")
  }

  if (decision.aAvisar.length === 0) {
    if (!modo.dryRun) await limpiarObsoletos()
    const message =
      elegibles.length === 0
        ? "Sin elementos que superen el umbral."
        : "Sin novedades: los elementos que superan el umbral ya fueron avisados."
    return { estadoHttp: 200, cuerpo: { ...resumen, resultado: "sin_novedades", message } }
  }

  if (modo.dryRun) {
    return { estadoHttp: 200, cuerpo: { ...resumen, resultado: "comprobacion", message: "Ejecución en modo prueba (sin envío)." } }
  }

  if (config.smtpFaltantes.length > 0) return faltaCorreo(resumen)

  // Reclamar ANTES de enviar. Si no se puede garantizar que nadie más avisa de
  // lo mismo, no se envía: se prefiere fallar y reintentar a duplicar el correo.
  const reclamo = construirReclamo(decision, avisos)
  const instante = hoy.toISOString()
  let ganados
  try {
    ganados = await deps.reclamarAvisos(reclamo, instante)
  } catch (error) {
    deps.registrarError?.("registro", error)
    return fallo("No se pudo registrar el aviso; no se envía para evitar duplicados.", resumen)
  }

  const aEnviar = decision.aAvisar.filter((e) => ganados.includes(e.id))
  const propio = reclamoDe(reclamo, ganados)
  const resumenEnvio = { ...resumen, items: aEnviar, nuevos: propio.nuevos.length, recordatorios: propio.recordatorios.length }

  if (aEnviar.length === 0) {
    await limpiarObsoletos()
    return {
      estadoHttp: 200,
      cuerpo: { ...resumenEnvio, resultado: "sin_novedades", message: "Sin novedades: otra ejecución ya avisó de estos elementos." },
    }
  }

  const correo = construirCorreoAviso({ elementos: aEnviar, hoy, meses: config.meses, baseUrl })
  const enviado = await intentar(() => enviar(correo), deps, "envio")
  if (!enviado) {
    // RF-14: un fallo de envío no deja elementos dados por avisados. Solo se
    // liberan los propios; si la liberación falla, queda constancia del registro.
    await intentar(() => deps.liberarAvisos(propio, instante), deps, "registro")
    return fallo("No se pudo enviar el correo de aviso.", resumenEnvio)
  }

  await limpiarObsoletos()
  return {
    estadoHttp: 200,
    cuerpo: { ...resumenEnvio, sent: true, resultado: "aviso_enviado", avisosRegistrados: true, message: "Aviso enviado correctamente." },
  }
}

module.exports = { leerConfiguracionAlertas, normalizarElemento, ejecutarAlertas }
