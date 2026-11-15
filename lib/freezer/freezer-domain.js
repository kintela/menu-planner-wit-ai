// Dominio puro de inventario de congeladores (Spec 005, T2).
// Sin red, sin Supabase y sin reloj global: toda decisión temporal usa la
// fecha/instante que el consumidor pasa explícitamente como parámetro.
// Solo presentación y validación; la autorización autoritativa vive en servidor
// (T3) y nunca en estas funciones.

const ESTADOS_ELEMENTO = Object.freeze(["fresco", "abierto", "bajo", "agotado"])
const ROLES_COMPARTICION = Object.freeze(["owner", "editor", "viewer"])

class FreezerDomainError extends TypeError {
  constructor(code, message) {
    super(message)
    this.name = "FreezerDomainError"
    this.code = code
  }
}

function fail(code, message) {
  throw new FreezerDomainError(code, message)
}

function parseEstado(value) {
  if (typeof value !== "string" || !ESTADOS_ELEMENTO.includes(value)) {
    return fail("INVALID_ESTADO", "El estado debe ser uno de: fresco, abierto, bajo, agotado.")
  }
  return value
}

function parseCantidad(value) {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "") return null
    const normalized = trimmed.replace(",", ".")
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return fail("INVALID_CANTIDAD", "La cantidad debe ser un número no negativo, con separador decimal , o .")
    }
    return Number(normalized)
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return fail("INVALID_CANTIDAD", "La cantidad debe ser un número no negativo.")
    }
    return value
  }
  return fail("INVALID_CANTIDAD", "La cantidad debe ser un número no negativo, con separador decimal , o .")
}

function formatCantidadMostrada(cantidad, unidad) {
  const parsed = parseCantidad(cantidad)
  if (parsed === null) return ""
  const texto = parsed.toLocaleString("es-ES", { useGrouping: false })
  const unidadTexto = typeof unidad === "string" ? unidad.trim() : ""
  return unidadTexto ? `${texto} ${unidadTexto}` : texto
}

function formatFechaMostrada(value) {
  if (value === null || value === undefined) return ""
  if (typeof value !== "string") {
    return fail("INVALID_FECHA", "La fecha debe usar el formato YYYY-MM-DD.")
  }
  const trimmed = value.trim()
  if (trimmed === "") return ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return fail("INVALID_FECHA", "La fecha debe usar el formato YYYY-MM-DD.")
  }
  const [year, month, day] = trimmed.split("-").map(Number)
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (month < 1 || month > 12 || day < 1 || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return fail("INVALID_FECHA", "La fecha no es una fecha civil válida.")
  }
  const pad = (part) => String(part).padStart(2, "0")
  return `${pad(day)}/${pad(month)}/${year}`
}

function text(value) {
  if (value === null || value === undefined) return ""
  return String(value)
}

function buildRepresentacionMostrada(elemento) {
  const datos = elemento && typeof elemento === "object" ? elemento : {}
  return {
    nombre: text(datos.nombre),
    categoria: text(datos.categoria),
    notas: text(datos.notas),
    unidad: text(datos.unidad),
    estado: text(datos.estado),
    cantidadMostrada: formatCantidadMostrada(datos.cantidad, datos.unidad),
    fechaCompraMostrada: formatFechaMostrada(datos.fecha_compra),
    fechaCongelacionMostrada: formatFechaMostrada(datos.fecha_congelacion),
    fechaCaducidadMostrada: formatFechaMostrada(datos.fecha_caducidad),
    reservado: datos.reservado === true,
  }
}

function coincideConBusqueda(representacion, termino) {
  const consulta = text(termino).trim().toLowerCase()
  if (consulta === "") return true
  if (!representacion || typeof representacion !== "object") return false
  const haystack = Object.values(representacion).map((valor) => text(valor).toLowerCase()).join(" ")
  return haystack.includes(consulta)
}

function requireEntero(value, code) {
  if (!Number.isInteger(value)) {
    return fail(code, "El número de cajones debe ser un entero entre 1 y 5.")
  }
  return value
}

function decidirCajones({ actuales, solicitados } = {}) {
  requireEntero(actuales, "CAJONES_FUERA_DE_RANGO")
  requireEntero(solicitados, "CAJONES_FUERA_DE_RANGO")
  if (solicitados < 1 || solicitados > 5 || actuales < 0) {
    return fail("CAJONES_FUERA_DE_RANGO", "El número de cajones debe estar entre 1 y 5.")
  }
  if (solicitados < actuales) {
    return fail("REDUCCION_NO_PERMITIDA", "Reducir el número de cajones no está soportado: no se elimina ningún cajón ni elemento.")
  }
  if (solicitados === actuales) return { tipo: "sin-cambios", aCrear: 0 }
  return { tipo: "ampliacion", aCrear: solicitados - actuales }
}

function buildCajonesNuevos({ existentes, aCrear } = {}) {
  requireEntero(aCrear, "CAJONES_FUERA_DE_RANGO")
  if (aCrear < 0) {
    return fail("CAJONES_FUERA_DE_RANGO", "El número de cajones nuevos no puede ser negativo.")
  }
  const lista = Array.isArray(existentes) ? existentes : []
  const maximaPosicion = lista.reduce((maximo, cajon) => {
    const posicion = cajon && typeof cajon === "object" ? Number(cajon.posicion) : NaN
    return Number.isInteger(posicion) && posicion > maximo ? posicion : maximo
  }, 0)
  return Array.from({ length: aCrear }, (_, indice) => {
    const posicion = maximaPosicion + indice + 1
    return { nombre: `Cajón ${posicion}`, posicion }
  })
}

// Matriz de presentación de roles (RF-23): owner/editor escriben, viewer lee.
// La denegación con la allowlist cerrada es deliberada: un rol malformado o
// desconocido no degrada a editor y queda sin lectura ni escritura. La
// comprobación autoritativa la repite el servidor con datos fiables (T3).
function puedeEscribir(rolAcceso) {
  return rolAcceso === "owner" || rolAcceso === "editor"
}

function puedeLeer(rolAcceso) {
  return ROLES_COMPARTICION.includes(rolAcceso)
}

module.exports = {
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
}
