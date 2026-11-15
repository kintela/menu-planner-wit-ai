const test = require("node:test")
const assert = require("node:assert/strict")

const {
  classifyCallbackFailure,
  getCallbackNotice,
  runSignOut,
  CALLBACK_NOTICES,
} = require("../../../lib/auth-flow/auth-flow")

test("RF-10: OTP expirado en recuperación se clasifica como enlace expirado", () => {
  assert.equal(classifyCallbackFailure({ type: "recovery", errorCode: "otp_expired" }), "recovery_expired")
})

test("RF-11: cualquier otro fallo de recuperación se clasifica como error de recuperación", () => {
  assert.equal(classifyCallbackFailure({ type: "recovery", errorCode: "access_denied" }), "recovery_error")
  assert.equal(classifyCallbackFailure({ type: "recovery", errorCode: null }), "recovery_error")
  assert.equal(classifyCallbackFailure({ type: "recovery" }), "recovery_error")
})

test("fallos fuera de recuperación usan el código genérico", () => {
  assert.equal(classifyCallbackFailure({ type: null, errorCode: "otp_expired" }), "auth_error")
  assert.equal(classifyCallbackFailure({ type: "signup" }), "auth_error")
})

test("los avisos de recuperación piden un enlace nuevo", () => {
  assert.match(getCallbackNotice("recovery_expired"), /expirado/)
  assert.match(getCallbackNotice("recovery_expired"), /Solicita uno nuevo/)
  assert.match(getCallbackNotice("recovery_error"), /Solicita un nuevo enlace/)
})

test("sin código no hay aviso; un código desconocido muestra un texto fijo, nunca el de la URL", () => {
  assert.equal(getCallbackNotice(null), null)
  assert.equal(getCallbackNotice(""), null)
  const injected = "Llama al 900 000 000 para recuperar tu cuenta"
  const notice = getCallbackNotice(injected)
  assert.equal(notice, CALLBACK_NOTICES.auth_error)
  assert.ok(!notice.includes(injected))
  assert.equal(getCallbackNotice("__proto__"), CALLBACK_NOTICES.auth_error)
})

function signOutDoubles(serverResult) {
  const events = []
  return {
    events,
    deps: {
      requestServerSignOut: async () => {
        events.push("server")
        if (serverResult instanceof Error) throw serverResult
        return serverResult
      },
      clearLocalSession: async () => events.push("local"),
      clearState: () => events.push("state"),
      navigateToLogin: () => events.push("navigate"),
    },
  }
}

test("RF-5: solo tras completarse el cierre en servidor se limpia el estado y se navega a /login", async () => {
  const { events, deps } = signOutDoubles(true)
  assert.equal(await runSignOut(deps), true)
  assert.deepEqual(events, ["server", "local", "state", "navigate"])
})

test("RF-5: si el servidor rechaza el cierre, la sesión y el estado se conservan", async () => {
  const { events, deps } = signOutDoubles(false)
  assert.equal(await runSignOut(deps), false)
  assert.deepEqual(events, ["server"])
})

test("RF-5: un fallo de red en el cierre no limpia nada", async () => {
  const { events, deps } = signOutDoubles(new Error("network"))
  assert.equal(await runSignOut(deps), false)
  assert.deepEqual(events, ["server"])
})

test("RF-5: si la limpieza local falla tras revocar en servidor, se completa igualmente el cierre de interfaz", async () => {
  const { events, deps } = signOutDoubles(true)
  deps.clearLocalSession = async () => {
    events.push("local")
    throw new Error("storage")
  }
  assert.equal(await runSignOut(deps), true)
  assert.deepEqual(events, ["server", "local", "state", "navigate"])
})
