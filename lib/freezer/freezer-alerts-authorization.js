// Autorización de la ruta de alertas del congelador (Spec 007, T5).
// Server-only por convención: usa `node:crypto`. Sin red y sin Next. La ruta
// pasa el valor de `CRON_SECRET` y la comprobación de administrador; este
// módulo solo decide, y nunca devuelve ni registra el secreto.

const { createHash, timingSafeEqual } = require("node:crypto")

// Respuesta única para cualquier rechazo: no distingue la causa y no incluye
// ningún dato del inventario, ni su tamaño, ni la existencia del congelador.
const RESPUESTA_NO_AUTORIZADO = Object.freeze({
  estado: 403,
  cuerpo: Object.freeze({ error: "No autorizado" }),
})

// "Bearer <token>" -> token; cualquier otra forma -> null.
function extraerBearer(cabecera) {
  if (typeof cabecera !== "string") return null
  const partes = /^\s*bearer\s+(\S+)\s*$/i.exec(cabecera)
  return partes ? partes[1] : null
}

// Compara resúmenes del mismo tamaño en tiempo constante: `timingSafeEqual`
// exige longitudes iguales, y resumir ambos lados evita además filtrar la
// longitud del secreto.
function igualesEnTiempoConstante(a, b) {
  const resumenA = createHash("sha256").update(a).digest()
  const resumenB = createHash("sha256").update(b).digest()
  return timingSafeEqual(resumenA, resumenB)
}

// Vercel envía `Authorization: Bearer <CRON_SECRET>` cuando la variable existe.
// Sin secreto configurado la vía queda cerrada: un secreto vacío no debe poder
// coincidir con un token vacío.
function credencialCronValida(cabeceraAuthorization, secretoCron) {
  if (typeof secretoCron !== "string") return false
  const secreto = secretoCron.trim()
  if (secreto === "") return false
  const token = extraerBearer(cabeceraAuthorization)
  if (token === null) return false
  return igualesEnTiempoConstante(token, secreto)
}

// Decide si la petición está autorizada y por qué vía. `comprobarAdmin` solo se
// invoca si la credencial del programador no basta; si falla, se deniega.
async function decidirAutorizacion({ cabeceraAuthorization, secretoCron, comprobarAdmin }) {
  if (credencialCronValida(cabeceraAuthorization, secretoCron)) {
    return { autorizado: true, via: "cron" }
  }
  try {
    if ((await comprobarAdmin()) === true) return { autorizado: true, via: "admin" }
  } catch {
    // Un fallo al comprobar el rol nunca autoriza ni propaga detalles internos.
  }
  return { autorizado: false, via: null }
}

module.exports = {
  RESPUESTA_NO_AUTORIZADO,
  extraerBearer,
  credencialCronValida,
  decidirAutorizacion,
}
