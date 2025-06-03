/**
 * Utilidad para manejar rate limiting en Supabase
 */

// Contador de solicitudes por endpoint
const requestCounts: Record<string, { count: number; resetTime: number }> = {}

// Tiempo de ventana para contar solicitudes (ms)
const WINDOW_SIZE = 10000 // 10 segundos

// Límites por endpoint
const ENDPOINT_LIMITS: Record<string, number> = {
  default: 10, // 10 solicitudes por ventana por defecto
  recipes: 5, // 5 solicitudes por ventana para recetas
  auth: 3, // 3 solicitudes por ventana para auth
}

/**
 * Comprueba si una solicitud debe ser limitada
 */
export function shouldRateLimit(endpoint: string): boolean {
  const now = Date.now()
  const key = endpoint.toLowerCase()

  // Determinar qué límite aplicar
  let limit = ENDPOINT_LIMITS.default
  Object.keys(ENDPOINT_LIMITS).forEach((endpointKey) => {
    if (key.includes(endpointKey)) {
      limit = ENDPOINT_LIMITS[endpointKey]
    }
  })

  // Inicializar o resetear contador si es necesario
  if (!requestCounts[key] || now > requestCounts[key].resetTime) {
    requestCounts[key] = {
      count: 1,
      resetTime: now + WINDOW_SIZE,
    }
    return false
  }

  // Incrementar contador
  requestCounts[key].count++

  // Comprobar si excede el límite
  return requestCounts[key].count > limit
}

/**
 * Calcula el tiempo de espera para retry con backoff exponencial
 */
export function calculateBackoff(attempt: number, baseDelay = 1000): number {
  // Backoff exponencial con jitter
  const expBackoff = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * 500
  return expBackoff + jitter
}

/**
 * Wrapper para consultas de Supabase con manejo de rate limiting
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    endpoint: string
    maxRetries?: number
    baseDelay?: number
  },
): Promise<{ data: T | null; error: any }> {
  const { endpoint, maxRetries = 3, baseDelay = 500 } = options
  let retries = 0
  let lastError: any = null

  while (retries <= maxRetries) {
    try {
      // Añadir un pequeño retraso aleatorio para evitar colisiones
      if (retries > 0) {
        const delay = baseDelay * Math.pow(2, retries - 1) + Math.random() * 200
        console.log(`⏱️ Reintento ${retries}/${maxRetries} para ${endpoint} después de ${delay.toFixed(0)}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      // Ejecutar la consulta
      const result = await queryFn()

      // Si hay un error específico de rate limiting, manejarlo
      if (result.error) {
        const errorMessage = result.error.message || String(result.error)

        // Detectar errores de rate limiting
        if (
          errorMessage.includes("Too Many Requests") ||
          errorMessage.includes("429") ||
          errorMessage.includes("rate limit")
        ) {
          console.warn(`⚠️ Rate limit alcanzado en ${endpoint} (intento ${retries + 1}/${maxRetries + 1})`)
          lastError = result.error
          retries++
          continue
        }

        // Otros errores, simplemente devolver el resultado
        return result
      }

      // Éxito
      return result
    } catch (error: any) {
      console.error(`❌ Error en consulta ${endpoint} (intento ${retries + 1}/${maxRetries + 1}):`, error)

      // Detectar errores de rate limiting en excepciones
      const errorMessage = error.message || String(error)
      if (
        errorMessage.includes("Too Many Requests") ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit")
      ) {
        console.warn(`⚠️ Rate limit alcanzado en ${endpoint} (intento ${retries + 1}/${maxRetries + 1})`)
        lastError = error
        retries++
        continue
      }

      // Para otros errores, devolver un objeto de resultado con el error
      return { data: null, error }
    }
  }

  // Si llegamos aquí, se agotaron los reintentos
  console.error(`❌ Se agotaron los reintentos para ${endpoint}`)
  return { data: null, error: lastError || new Error(`Se agotaron los reintentos para ${endpoint}`) }
}
