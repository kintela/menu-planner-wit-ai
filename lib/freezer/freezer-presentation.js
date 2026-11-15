// Lógica de presentación pura del gestor de congeladores (Spec 005, T8),
// siguiendo el patrón de `lib/weekly-menu/weekly-menu-presentation.js`.
// Sin DOM, sin red, sin Supabase y sin reloj global: la fecha del navegador
// llega siempre como parámetro explícito. La autorización autoritativa la
// repite el servidor (T3); aquí solo se presenta la matriz de permisos.

const {
  buildRepresentacionMostrada,
  coincideConBusqueda,
  parseCantidad,
  parseEstado,
  formatCantidadMostrada,
  formatFechaMostrada,
  puedeEscribir,
  puedeLeer,
} = require("./freezer-domain")

class FreezerPresentacionError extends TypeError {
  constructor(code, message) {
    super(message)
    this.name = "FreezerPresentacionError"
    this.code = code
  }
}

function fail(code, message) {
  throw new FreezerPresentacionError(code, message)
}

function text(value) {
  if (value === null || value === undefined) return ""
  return String(value)
}

const datosDe = (valor) => (valor && typeof valor === "object" ? valor : {})

const itemsDe = (cajon) => {
  const datos = datosDe(cajon)
  return Array.isArray(datos.items) ? datos.items : []
}

// RF-11: defaults del alta. `hoy` es la fecha del navegador (YYYY-MM-DD)
// pasada explícitamente por el consumidor; caducidad vacía y sin orden
// cronológico impuesto entre fechas.
function buildNewItemForm(hoy) {
  const fecha = typeof hoy === "string" ? hoy : ""
  return {
    cajon_id: "",
    nombre: "",
    cantidad: "",
    unidad: "",
    notas: "",
    categoria: "",
    estado: "fresco",
    fecha_compra: fecha,
    fecha_congelacion: fecha,
    fecha_caducidad: "",
  }
}

// RF-10: la cantidad se edita como texto libre y se muestra sin valor cuando
// no existe; el resto de campos conservan su valor para la edición completa.
function buildItemFormState(item) {
  const datos = datosDe(item)
  const cantidad = parseCantidad(datos.cantidad)
  return {
    cajon_id: text(datos.cajon_id),
    nombre: text(datos.nombre),
    cantidad: cantidad === null ? "" : String(cantidad),
    unidad: text(datos.unidad),
    notas: text(datos.notas),
    categoria: text(datos.categoria),
    estado: text(datos.estado) || "fresco",
    fecha_compra: text(datos.fecha_compra),
    fecha_congelacion: text(datos.fecha_congelacion),
    fecha_caducidad: text(datos.fecha_caducidad),
  }
}

// Validación de nombre y estado compartida por alta y edición: los mensajes
// son comprensibles en español y viajan solo si los datos son válidos (RF-8,
// RF-9, RF-27). El servidor repite toda la validación con el mismo dominio.
function validarCamposObligatorios(datos) {
  const nombre = text(datos.nombre).trim()
  if (!nombre) {
    return fail("NOMBRE_OBLIGATORIO", "El nombre del elemento es obligatorio.")
  }
  return {
    nombre,
    estado: parseEstado(text(datos.estado) || "fresco"),
  }
}

// RF-10/RF-27: cantidad del formulario validada con el dominio antes de viajar
// al contrato HTTP; vacío → sin cantidad, "0" → 0, "1,5"/"1.5" → 1.5.
function parseCantidadDeFormulario(valor) {
  return parseCantidad(valor)
}

// Cuerpo del POST /api/freezer/items (contrato T6): los opcionales vacíos se
// omiten y la cantidad solo viaja cuando existe.
function buildItemPayload(formState, cajonId) {
  const datos = datosDe(formState)
  const { nombre, estado } = validarCamposObligatorios(datos)
  const cajon = text(cajonId).trim()
  if (!cajon) {
    return fail("CAJON_OBLIGATORIO", "Selecciona un cajón válido.")
  }

  const payload = { cajon_id: cajon, nombre, estado }

  const cantidad = parseCantidadDeFormulario(datos.cantidad)
  if (cantidad !== null) payload.cantidad = cantidad

  const unidad = text(datos.unidad).trim()
  if (unidad) payload.unidad = unidad
  const notas = text(datos.notas).trim()
  if (notas) payload.notas = notas
  const categoria = text(datos.categoria).trim()
  if (categoria) payload.categoria = categoria
  const fechaCompra = text(datos.fecha_compra)
  if (fechaCompra) payload.fecha_compra = fechaCompra
  const fechaCongelacion = text(datos.fecha_congelacion)
  if (fechaCongelacion) payload.fecha_congelacion = fechaCongelacion
  const fechaCaducidad = text(datos.fecha_caducidad)
  if (fechaCaducidad) payload.fecha_caducidad = fechaCaducidad

  return payload
}

// Cuerpo `updates` del PATCH /api/freezer/items/[itemId] (contrato T6): la
// edición es completa, así que los opcionales vacíos se limpian a null y la
// cantidad ausente viaja como null para dejar el elemento sin valor.
function buildItemUpdates(formState) {
  const datos = datosDe(formState)
  const { nombre, estado } = validarCamposObligatorios(datos)
  const cajon = text(datos.cajon_id).trim()
  if (!cajon) {
    return fail("CAJON_OBLIGATORIO", "Selecciona un cajón válido.")
  }

  return {
    cajon_id: cajon,
    nombre,
    estado,
    cantidad: parseCantidadDeFormulario(datos.cantidad),
    unidad: text(datos.unidad).trim() || null,
    notas: text(datos.notas).trim() || null,
    categoria: text(datos.categoria).trim() || null,
    fecha_compra: text(datos.fecha_compra) || null,
    fecha_congelacion: text(datos.fecha_congelacion) || null,
    fecha_caducidad: text(datos.fecha_caducidad) || null,
  }
}

// RF-20/RF-21: búsqueda textual parcial e insensible a mayúsculas sobre la
// representación mostrada (fechas en es-ES y cantidad tal como se ve), nunca
// sobre los valores almacenados, y sin filtros estructurados.
function filtrarPorBusqueda(items, termino) {
  const lista = Array.isArray(items) ? items : []
  if (typeof termino !== "string" || termino.trim() === "") return lista
  return lista.filter((item) => coincideConBusqueda(buildRepresentacionMostrada(item), termino))
}

// RF-20: los cajones permanecen siempre visibles; solo se filtra su contenido
// y se señala el estado de sin coincidencias. Nunca altera los datos.
function buildVistaCajon(cajon, termino) {
  const items = itemsDe(cajon)
  const visibles = filtrarPorBusqueda(items, termino)
  return {
    cajon,
    items,
    visibles,
    total: items.length,
    sinCoincidencias: items.length > 0 && visibles.length === 0,
  }
}

// RF-23: matriz de permisos para la presentación; el servidor repite la
// comprobación con datos fiables.
function buildPresentacionRol(rolAcceso) {
  return {
    puedeEscribir: puedeEscribir(rolAcceso),
    puedeLeer: puedeLeer(rolAcceso),
    esCompartido: rolAcceso === "editor" || rolAcceso === "viewer",
  }
}

// RF-1/RF-2/RF-23: el servidor entrega únicamente el resultado de su
// comprobación de identidad, perfil y propiedad. Esta función no autoriza ni
// interpreta roles: traduce ese resultado en visibilidad para la UI del
// singleton privado.
function buildPresentacionAcceso(esAdministradorAutorizado) {
  const autorizado = esAdministradorAutorizado === true
  return {
    esAdministradorAutorizado: autorizado,
    mostrarMenu: autorizado,
    puedeLeer: autorizado,
    puedeEscribir: autorizado,
  }
}

// RF-18/RF-19: el vaciado solo se ofrece en un cajón con al menos un elemento
// y nunca existe vaciado global del congelador.
function debeOfrecerVaciado(cajon) {
  return itemsDe(cajon).length > 0
}

// RF-13/RF-22: la impresión usa exactamente las representaciones que puede
// localizar la búsqueda y que muestra el gestor. El instante de generación
// pertenece al componente; esta función solo transforma datos.
function buildPresentacionImpresion(item) {
  const datos = datosDe(item)
  return {
    nombre: text(datos.nombre),
    cantidad: formatCantidadMostrada(datos.cantidad, ""),
    unidad: text(datos.unidad),
    estado: text(datos.estado),
    categoria: text(datos.categoria),
    fechaCompra: formatFechaMostrada(datos.fecha_compra),
    fechaCongelacion: formatFechaMostrada(datos.fecha_congelacion),
    fechaCaducidad: formatFechaMostrada(datos.fecha_caducidad),
    notas: text(datos.notas),
    reservado: datos.reservado === true,
  }
}

module.exports = {
  FreezerPresentacionError,
  buildNewItemForm,
  buildItemFormState,
  parseCantidadDeFormulario,
  buildItemPayload,
  buildItemUpdates,
  filtrarPorBusqueda,
  buildVistaCajon,
  buildPresentacionRol,
  buildPresentacionAcceso,
  debeOfrecerVaciado,
  buildPresentacionImpresion,
}
