// Dominio puro de las alertas del congelador (Spec 007, T4).
// Sin red, sin Supabase, sin Next y sin reloj global: toda decisión temporal
// usa el instante `hoy` que el consumidor pasa explícitamente. Las fechas de
// calendario se tratan siempre en UTC para que el resultado no dependa de la
// zona horaria del servidor.

const UMBRAL_MESES_POR_DEFECTO = 2
const DIAS_RECORDATORIO_POR_DEFECTO = 30
const MS_POR_DIA = 24 * 60 * 60 * 1000

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

// Lee un entero positivo de configuración; cualquier otro valor cae al defecto.
function parseEnteroPositivo(valor, porDefecto) {
  if (typeof valor === "number") {
    return Number.isInteger(valor) && valor > 0 ? valor : porDefecto
  }
  if (typeof valor !== "string") return porDefecto
  const texto = valor.trim()
  if (!/^\d+$/.test(texto)) return porDefecto
  const numero = Number(texto)
  return Number.isSafeInteger(numero) && numero > 0 ? numero : porDefecto
}

function parseMesesUmbral(valor) {
  return parseEnteroPositivo(valor, UMBRAL_MESES_POR_DEFECTO)
}

function parseDiasRecordatorio(valor) {
  return parseEnteroPositivo(valor, DIAS_RECORDATORIO_POR_DEFECTO)
}

// Devuelve { anio, mes, dia } si la cadena es una fecha de calendario real.
function parseFechaCalendario(valor) {
  if (typeof valor !== "string") return null
  const partes = FECHA_ISO.exec(valor)
  if (!partes) return null
  const anio = Number(partes[1])
  const mes = Number(partes[2])
  const dia = Number(partes[3])
  const comprobada = new Date(Date.UTC(anio, mes - 1, dia))
  if (
    comprobada.getUTCFullYear() !== anio ||
    comprobada.getUTCMonth() !== mes - 1 ||
    comprobada.getUTCDate() !== dia
  ) {
    return null
  }
  return { anio, mes, dia }
}

function aCadenaFecha({ anio, mes, dia }) {
  return `${String(anio).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
}

function diasEnMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

function fechaDeInstante(instante) {
  return {
    anio: instante.getUTCFullYear(),
    mes: instante.getUTCMonth() + 1,
    dia: instante.getUTCDate(),
  }
}

// Resta meses de calendario ajustando al último día del mes de destino.
function restarMeses({ anio, mes, dia }, meses) {
  const indice = anio * 12 + (mes - 1) - meses
  const anioDestino = Math.floor(indice / 12)
  const mesDestino = (indice % 12) + 1
  return { anio: anioDestino, mes: mesDestino, dia: Math.min(dia, diasEnMes(anioDestino, mesDestino)) }
}

function sumarMeses({ anio, mes, dia }, meses) {
  return restarMeses({ anio, mes, dia }, -meses)
}

function diasDesdeEpoch({ anio, mes, dia }) {
  return Math.round(Date.UTC(anio, mes - 1, dia) / MS_POR_DIA)
}

// RF-3: fecha límite a partir de la cual un elemento es elegible.
function calcularFechaUmbral(hoy, meses) {
  return aCadenaFecha(restarMeses(fechaDeInstante(hoy), meses))
}

// RF-3: elegibles = congelados en o antes del umbral. Quedan fuera los que no
// tienen fecha, la tienen ilegible o imposible, y los de fecha futura (que
// siempre son posteriores a un umbral situado en el pasado).
function seleccionarElegibles(elementos, fechaUmbral) {
  return elementos
    .filter((elemento) => {
      const fecha = parseFechaCalendario(elemento?.fecha_congelacion)
      return fecha !== null && aCadenaFecha(fecha) <= fechaUmbral
    })
    .slice()
    .sort((a, b) => {
      if (a.fecha_congelacion !== b.fecha_congelacion) {
        return a.fecha_congelacion < b.fecha_congelacion ? -1 : 1
      }
      return String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""), "es")
    })
}

// Días naturales (UTC) entre dos instantes. Se miden por fecha y no por horas
// exactas: el aviso se registra a las 08:00:05 y la siguiente ejecución llega a
// las 08:00:02, de modo que por horas el recordatorio se retrasaría un día.
function diasNaturalesEntre(desde, hasta) {
  return diasDesdeEpoch(fechaDeInstante(hasta)) - diasDesdeEpoch(fechaDeInstante(desde))
}

// RF-6, RF-8, RF-9, RF-18: decide a cuáles avisar. `aAvisar` es la lista única
// (nuevos y recordatorios vencidos) en el mismo orden que los elegibles.
function decidirAvisos({ elegibles, avisos, hoy, diasRecordatorio }) {
  const avisadoEn = new Map()
  for (const aviso of avisos) {
    const instante = new Date(aviso?.avisado_en)
    // Un aviso con fecha ilegible no bloquea el aviso: se trata como ausente.
    if (!Number.isNaN(instante.getTime())) avisadoEn.set(aviso.elemento_id, instante)
  }

  const nuevos = []
  const recordatorios = []
  const yaAvisados = []

  for (const elemento of elegibles) {
    const ultimo = avisadoEn.get(elemento.id)
    if (!ultimo) {
      nuevos.push(elemento)
    } else if (diasNaturalesEntre(ultimo, hoy) >= diasRecordatorio) {
      recordatorios.push(elemento)
    } else {
      yaAvisados.push(elemento)
    }
  }

  const aAvisar = elegibles.filter((e) => nuevos.includes(e) || recordatorios.includes(e))
  return { aAvisar, nuevos, recordatorios, yaAvisados }
}

// RF-10: avisos cuyo elemento ya no es elegible, para descartarlos y que un
// elemento que vuelva a serlo se trate como nuevo.
function avisosObsoletos(avisos, elegibles) {
  const vigentes = new Set(elegibles.map((e) => e.id))
  return avisos.map((a) => a.elemento_id).filter((id) => !vigentes.has(id))
}

function pareceDireccion(valor) {
  if (/\s/.test(valor)) return false
  const partes = valor.split("@")
  return partes.length === 2 && partes[0].length > 0 && partes[1].includes(".") && !partes[1].startsWith(".") && !partes[1].endsWith(".")
}

// RF-11: normaliza la lista configurada. No hay destinatarios por defecto
// (RF-12). Las entradas inválidas se cuentan pero nunca se devuelven, para no
// registrar direcciones en logs.
function normalizarDestinatarios(valor) {
  let entradas
  if (Array.isArray(valor)) entradas = valor
  else if (typeof valor === "string") entradas = valor.split(",")
  else return { destinatarios: [], descartados: 0 }

  const vistos = new Set()
  let descartados = 0
  for (const entrada of entradas) {
    if (typeof entrada !== "string") continue
    const limpia = entrada.trim().toLowerCase()
    if (limpia === "") continue
    if (!pareceDireccion(limpia)) {
      descartados += 1
      continue
    }
    vistos.add(limpia)
  }
  return { destinatarios: Array.from(vistos), descartados }
}

// RF-13: tiempo que lleva congelado un elemento, en meses completos de
// calendario más los días sobrantes. Nulo si la fecha no es válida o es futura.
function calcularTiempoCongelado(fechaCongelacion, hoy) {
  const desde = parseFechaCalendario(fechaCongelacion)
  if (desde === null) return null
  const hasta = fechaDeInstante(hoy)
  const dias = diasDesdeEpoch(hasta) - diasDesdeEpoch(desde)
  if (dias < 0) return null

  let meses = (hasta.anio - desde.anio) * 12 + (hasta.mes - desde.mes)
  if (aCadenaFecha(sumarMeses(desde, meses)) > aCadenaFecha(hasta)) meses -= 1
  const ancla = sumarMeses(desde, meses)
  return { dias, meses, diasResto: diasDesdeEpoch(hasta) - diasDesdeEpoch(ancla) }
}

module.exports = {
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
}
