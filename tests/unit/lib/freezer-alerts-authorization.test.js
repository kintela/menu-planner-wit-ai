const test = require("node:test")
const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")

const {
  extraerBearer,
  credencialCronValida,
  decidirAutorizacion,
  RESPUESTA_NO_AUTORIZADO,
} = require("../../../lib/freezer/freezer-alerts-authorization")

// Spec 007 T5. Los secretos de estos tests son valores ficticios: ningún
// secreto real se escribe ni se lee en el repositorio.
const SECRETO = "valor-ficticio-solo-para-tests-0123456789"

const sinAdmin = async () => false
const conAdmin = async () => true

test("RF-1: extrae el token de una cabecera Bearer, sin distinguir mayúsculas en el esquema", () => {
  assert.equal(extraerBearer(`Bearer ${SECRETO}`), SECRETO)
  assert.equal(extraerBearer(`bearer ${SECRETO}`), SECRETO)
  assert.equal(extraerBearer(`BEARER   ${SECRETO}  `), SECRETO)
})

test("RF-1: otras cabeceras o formas no son un Bearer", () => {
  for (const invalida of [undefined, null, "", "Bearer", "Bearer ", "Basic abc", `Token ${SECRETO}`, SECRETO, 42, {}]) {
    assert.equal(extraerBearer(invalida), null, `valor ${String(invalida)}`)
  }
})

test("RF-1: el secreto correcto acredita al programador", () => {
  assert.equal(credencialCronValida(`Bearer ${SECRETO}`, SECRETO), true)
})

test("RF-1: un secreto distinto, parcial o ampliado no acredita y no lanza errores de longitud", () => {
  for (const cabecera of [
    "Bearer otro-secreto",
    `Bearer ${SECRETO.slice(0, -1)}`,
    `Bearer ${SECRETO}x`,
    `Bearer ${SECRETO.toUpperCase()}`,
    "Bearer a",
  ]) {
    assert.equal(credencialCronValida(cabecera, SECRETO), false, cabecera)
  }
})

test("RF-2: sin secreto configurado la vía del programador queda cerrada, aunque llegue una cabecera vacía", () => {
  // El caso más peligroso: secreto ausente y token vacío no deben "coincidir".
  for (const secreto of [undefined, null, "", "   "]) {
    assert.equal(credencialCronValida("Bearer ", secreto), false)
    assert.equal(credencialCronValida("Bearer x", secreto), false)
    assert.equal(credencialCronValida("", secreto), false)
    assert.equal(credencialCronValida(undefined, secreto), false)
  }
})

test("RF-1: con el secreto correcto se autoriza como programador sin consultar al administrador", async () => {
  let consultas = 0
  const decision = await decidirAutorizacion({
    cabeceraAuthorization: `Bearer ${SECRETO}`,
    secretoCron: SECRETO,
    comprobarAdmin: async () => {
      consultas += 1
      return false
    },
  })
  assert.deepEqual(decision, { autorizado: true, via: "cron" })
  assert.equal(consultas, 0)
})

test("RF-2: sin credencial válida y sin sesión admin no se autoriza", async () => {
  for (const cabeceraAuthorization of [undefined, "", "Bearer incorrecto", "Basic abc"]) {
    const decision = await decidirAutorizacion({ cabeceraAuthorization, secretoCron: SECRETO, comprobarAdmin: sinAdmin })
    assert.deepEqual(decision, { autorizado: false, via: null }, String(cabeceraAuthorization))
  }
})

test("una persona con rol admin autenticada sigue autorizada por su sesión (la usa /admin)", async () => {
  const decision = await decidirAutorizacion({ cabeceraAuthorization: undefined, secretoCron: SECRETO, comprobarAdmin: conAdmin })
  assert.deepEqual(decision, { autorizado: true, via: "admin" })
})

test("una credencial de programador incorrecta no impide que un admin autenticado entre", async () => {
  const decision = await decidirAutorizacion({ cabeceraAuthorization: "Bearer incorrecto", secretoCron: SECRETO, comprobarAdmin: conAdmin })
  assert.deepEqual(decision, { autorizado: true, via: "admin" })
})

test("RF-2: sin secreto configurado un admin entra, y una cabecera cualquiera no", async () => {
  assert.deepEqual(
    await decidirAutorizacion({ cabeceraAuthorization: "Bearer lo-que-sea", secretoCron: undefined, comprobarAdmin: sinAdmin }),
    { autorizado: false, via: null },
  )
  assert.deepEqual(
    await decidirAutorizacion({ cabeceraAuthorization: "Bearer lo-que-sea", secretoCron: undefined, comprobarAdmin: conAdmin }),
    { autorizado: true, via: "admin" },
  )
})

test("RF-2: si la comprobación de administrador falla, se deniega en lugar de propagar el error", async () => {
  const decision = await decidirAutorizacion({
    cabeceraAuthorization: undefined,
    secretoCron: SECRETO,
    comprobarAdmin: async () => {
      throw new Error("detalle interno del proveedor")
    },
  })
  assert.deepEqual(decision, { autorizado: false, via: null })
})

test("RF-2: el rechazo es uniforme y no revela datos del inventario ni la causa", () => {
  assert.equal(RESPUESTA_NO_AUTORIZADO.estado, 403)
  assert.deepEqual(RESPUESTA_NO_AUTORIZADO.cuerpo, { error: "No autorizado" })
  assert.equal(Object.isFrozen(RESPUESTA_NO_AUTORIZADO), true)
  const texto = JSON.stringify(RESPUESTA_NO_AUTORIZADO)
  for (const prohibido of ["congelador", "items", "eligibleItems", "totalItems", "recipients", "thresholdDate", "secret", "secreto"]) {
    assert.doesNotMatch(texto, new RegExp(prohibido, "i"), prohibido)
  }
})

test("seguridad: el resultado de la decisión nunca contiene el secreto ni el token recibido", async () => {
  const exito = await decidirAutorizacion({ cabeceraAuthorization: `Bearer ${SECRETO}`, secretoCron: SECRETO, comprobarAdmin: sinAdmin })
  const fallo = await decidirAutorizacion({ cabeceraAuthorization: "Bearer token-recibido-incorrecto", secretoCron: SECRETO, comprobarAdmin: sinAdmin })
  assert.doesNotMatch(JSON.stringify(exito), new RegExp(SECRETO))
  assert.doesNotMatch(JSON.stringify(fallo), /token-recibido-incorrecto/)
})

test("seguridad: la comparación usa timingSafeEqual y no el operador de igualdad sobre el secreto", () => {
  const codigo = readFileSync(resolve(__dirname, "../../../lib/freezer/freezer-alerts-authorization.js"), "utf8")
  assert.match(codigo, /timingSafeEqual/)
})

// --- Comprobaciones estáticas de la ruta (la ruta pasa a ser adaptador en T6) ---
const rutaPath = resolve(__dirname, "../../../app/api/cron/freezer-alerts/route.ts")
const ruta = () => readFileSync(rutaPath, "utf8")

test("RF-1: la ruta ya no se fía de la cabecera x-vercel-cron ni del user-agent", () => {
  const codigo = ruta()
  assert.doesNotMatch(codigo, /x-vercel-cron/i)
  assert.doesNotMatch(codigo, /vercel cron/i)
  assert.doesNotMatch(codigo, /user-agent/i)
})

test("RF-1/RF-2: la ruta decide con el módulo de autorización y el secreto de entorno de servidor", () => {
  const codigo = ruta()
  assert.match(codigo, /decidirAutorizacion/)
  assert.match(codigo, /process\.env\.CRON_SECRET/)
  assert.doesNotMatch(codigo, /NEXT_PUBLIC_CRON/)
})

test("la llamada a isAdmin recibe el cookie store que exige su firma", () => {
  const codigo = ruta()
  assert.doesNotMatch(codigo, /isAdmin\(\s*\)/)
  assert.match(codigo, /isAdmin\(\s*\w+/)
})

test("RF-2: el secreto no se escribe en logs ni en la respuesta de la ruta", () => {
  const codigo = ruta()
  assert.doesNotMatch(codigo, /console\.\w+\([^)]*CRON_SECRET/)
  assert.doesNotMatch(codigo, /NextResponse\.json\([^)]*CRON_SECRET/)
})

test("la ruta responde con el rechazo uniforme", () => {
  assert.match(ruta(), /RESPUESTA_NO_AUTORIZADO/)
})
