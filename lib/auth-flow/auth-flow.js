// Lógica pura de los flujos de cierre de sesión y callback de recuperación
// (Spec 001 T10). Sin red ni dependencias de Next/Supabase para poder probarla
// con `node --test`.

const RECOVERY_EXPIRED = "recovery_expired"
const RECOVERY_ERROR = "recovery_error"
const AUTH_ERROR = "auth_error"

// Textos fijos: /login nunca muestra texto recibido en la URL.
const CALLBACK_NOTICES = Object.freeze({
  [RECOVERY_EXPIRED]: "El enlace de recuperación ha expirado. Solicita uno nuevo.",
  [RECOVERY_ERROR]: "No se pudo completar la recuperación de contraseña. Solicita un nuevo enlace.",
  [AUTH_ERROR]: "No se pudo completar la autenticación. Inténtalo de nuevo.",
})

// RF-10/RF-11: clasifica un fallo del callback en un código público.
function classifyCallbackFailure({ type, errorCode } = {}) {
  if (type === "recovery") {
    return errorCode === "otp_expired" ? RECOVERY_EXPIRED : RECOVERY_ERROR
  }
  return AUTH_ERROR
}

// Traduce el parámetro `error` de /login a un aviso fijo (o null si no hay).
function getCallbackNotice(code) {
  if (!code) return null
  if (Object.prototype.hasOwnProperty.call(CALLBACK_NOTICES, code)) {
    return CALLBACK_NOTICES[code]
  }
  return CALLBACK_NOTICES[AUTH_ERROR]
}

// RF-5: el estado de interfaz solo se limpia cuando el servidor confirma el cierre.
async function runSignOut({ requestServerSignOut, clearLocalSession, clearState, navigateToLogin }) {
  let closed = false
  try {
    closed = (await requestServerSignOut()) === true
  } catch {
    closed = false
  }
  if (!closed) return false

  try {
    await clearLocalSession()
  } catch {
    // La sesión ya está revocada y sus cookies eliminadas por el servidor;
    // un fallo al limpiar restos locales no debe dejar la interfaz autenticada.
  }

  clearState()
  navigateToLogin()
  return true
}

module.exports = {
  CALLBACK_NOTICES,
  classifyCallbackFailure,
  getCallbackNotice,
  runSignOut,
}
