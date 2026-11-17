// Presentación pura de los correos de alerta del congelador (Spec 007, T6).
// Sin red, sin Next y sin reloj global. Todo texto dirigido a personas va en
// castellano (RF-17) y no hay direcciones de correo escritas (RF-12).

const { calcularTiempoCongelado } = require("./freezer-alerts-domain")

const NOMBRE_APP = "MenuPlanner"

function escaparHtml(valor) {
  if (valor === null || valor === undefined) return ""
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Fecha corta en castellano; "-" si no es una fecha de calendario válida.
function formatearFechaHumana(valor) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "-"
  const fecha = new Date(`${valor}T00:00:00Z`)
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) return "-"
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(fecha)
}

function formatearCantidad(cantidad, unidad) {
  if (cantidad === null || cantidad === undefined) return "-"
  const cantidadTexto = Number.isFinite(cantidad) ? `${cantidad}` : String(cantidad)
  return `${cantidadTexto}${unidad ? ` ${unidad}` : ""}`.trim()
}

function plural(cantidad, singular, pluralTexto) {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`
}

// RF-13: "10 meses y 30 días", "1 mes", "7 días".
function formatearTiempoCongelado(tiempo) {
  if (!tiempo) return "-"
  const { meses, diasResto } = tiempo
  if (meses === 0) return plural(diasResto, "día", "días")
  const parteMeses = plural(meses, "mes", "meses")
  return diasResto === 0 ? parteMeses : `${parteMeses} y ${plural(diasResto, "día", "días")}`
}

// Solo se enlaza un origen http(s): cualquier otro esquema, o una URL ilegible,
// se omite para que un valor de entorno o una cabecera no inyecten un enlace.
function origenSeguro(baseUrl) {
  if (typeof baseUrl !== "string" || baseUrl.trim() === "") return ""
  try {
    const url = new URL(baseUrl.trim())
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : ""
  } catch {
    return ""
  }
}

function etiquetaCajon(cajon) {
  if (!cajon?.nombre) return "-"
  return `${cajon.nombre}${cajon.posicion ? ` (pos. ${cajon.posicion})` : ""}`
}

// RF-6, RF-13, RF-17, RF-18: un único correo con lista única de elementos.
function construirCorreoAviso({ elementos, hoy, meses, baseUrl }) {
  const total = elementos.length
  const duracion = `${meses} ${meses === 1 ? "mes" : "meses"}`
  const titulo = `Elementos congelados ${duracion} o más`
  const introduccion =
    total === 1
      ? `Se encontró 1 elemento que lleva ${duracion} o más congelado.`
      : `Se encontraron ${total} elementos que llevan ${duracion} o más congelados.`
  const origen = origenSeguro(baseUrl)

  const filas = elementos.map((elemento) => ({
    nombre: elemento.nombre ?? "",
    congelado: formatearFechaHumana(elemento.fecha_congelacion),
    tiempo: formatearTiempoCongelado(calcularTiempoCongelado(elemento.fecha_congelacion, hoy)),
    cajon: etiquetaCajon(elemento.cajon),
    cantidad: formatearCantidad(elemento.cantidad, elemento.unidad),
    categoria: elemento.categoria || "-",
  }))

  const lineas = filas.map(
    (f) =>
      `- ${f.nombre} | Congelado: ${f.congelado} | Tiempo congelado: ${f.tiempo} | Cajón: ${f.cajon} | Cantidad: ${f.cantidad} | Categoría: ${f.categoria}`,
  )
  const pie = origen ? `\n\n${NOMBRE_APP}: ${origen}` : ""
  const text = `${NOMBRE_APP}\n${titulo}\n${introduccion}\n\n${lineas.join("\n")}${pie}`

  const celda = (valor) => `<td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${escaparHtml(valor)}</td>`
  const cuerpoTabla = filas
    .map((f) => `<tr>${celda(f.nombre)}${celda(f.congelado)}${celda(f.tiempo)}${celda(f.cajon)}${celda(f.cantidad)}${celda(f.categoria)}</tr>`)
    .join("")
  const enlace = origen || "#"

  const html = `
    <div style="font-family:Arial, sans-serif; background:#f3f4f6; padding:24px;">
      <div style="max-width:760px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
        <div style="background:#111827; padding:16px 24px;">
          <a href="${escaparHtml(enlace)}" style="color:#ffffff; font-size:20px; font-weight:700; text-decoration:none;">${escaparHtml(NOMBRE_APP)}</a>
        </div>
        <div style="padding:20px 24px; color:#111827;">
          <h2 style="margin:0 0 8px;">${escaparHtml(titulo)}</h2>
          <p style="margin:0 0 16px;">${escaparHtml(introduccion)}</p>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6; text-align:left;">
                <th style="padding:8px 10px;">Producto</th>
                <th style="padding:8px 10px;">Fecha de congelación</th>
                <th style="padding:8px 10px;">Tiempo congelado</th>
                <th style="padding:8px 10px;">Cajón</th>
                <th style="padding:8px 10px;">Cantidad</th>
                <th style="padding:8px 10px;">Categoría</th>
              </tr>
            </thead>
            <tbody>${cuerpoTabla}</tbody>
          </table>
        </div>
        <div style="padding:12px 24px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#6b7280;">
          <a href="${escaparHtml(enlace)}" style="color:#2563eb; text-decoration:none;">${escaparHtml(NOMBRE_APP)}</a>
        </div>
      </div>
    </div>
  `

  const subject = `[Congelador] ${plural(total, "elemento", "elementos")} con ${meses}+ ${meses === 1 ? "mes" : "meses"}`
  return { subject, text, html }
}

// Correo de prueba para comprobar la configuración de correo (RF-16, /admin).
function construirCorreoPrueba({ hoy, baseUrl }) {
  const hora = hoy.toISOString()
  const origen = origenSeguro(baseUrl)
  const pie = origen ? `\n\n${NOMBRE_APP}: ${origen}` : ""
  const text = `${NOMBRE_APP}\nCorreo de prueba enviado correctamente.\nHora: ${hora}${pie}`
  const enlace = origen || "#"
  const html = `
    <div style="font-family:Arial, sans-serif; background:#f3f4f6; padding:24px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e7eb;">
        <div style="background:#111827; padding:16px 24px;">
          <a href="${escaparHtml(enlace)}" style="color:#ffffff; font-size:20px; font-weight:700; text-decoration:none;">${escaparHtml(NOMBRE_APP)}</a>
        </div>
        <div style="padding:20px 24px; color:#111827;">
          <h2 style="margin:0 0 8px;">Correo de prueba</h2>
          <p style="margin:0;">Si ves este mensaje, la configuración de correo funciona.</p>
          <p style="margin:12px 0 0; color:#6b7280; font-size:12px;">Hora: ${escaparHtml(hora)}</p>
        </div>
      </div>
    </div>
  `
  return { subject: "[Congelador] Correo de prueba", text, html }
}

module.exports = {
  escaparHtml,
  formatearFechaHumana,
  formatearCantidad,
  formatearTiempoCongelado,
  construirCorreoAviso,
  construirCorreoPrueba,
}
