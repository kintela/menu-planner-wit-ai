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
  queryFn: () => Promise<T>,
  options: {
    endpoint: string
    maxRetries?: number
    baseDelay?: number
  },
): Promise<T> {
  const { endpoint, maxRetries = 3, baseDelay = 1000 } = options

  // Comprobar rate limiting local
  if (shouldRateLimit(endpoint)) {
    console.log(`🛑 Rate limiting local para ${endpoint}`)
    await new Promise((resolve) => setTimeout(resolve, baseDelay))
  }

  // Intentar la consulta con retries
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn()
    } catch (error: any) {
      // Comprobar si es el último intento
      const isLastAttempt = attempt === maxRetries - 1

      // Comprobar si es error de rate limiting
      const isRateLimited =
        error?.message?.includes("Too Many") || error?.message?.includes("429") || error?.status === 429

      if (isLastAttempt || !isRateLimited) {
        throw error
      }

      // Calcular tiempo de espera
      const delayMs = calculateBackoff(attempt, baseDelay)
      console.log(`⏱️ Rate limited en ${endpoint}, reintentando en ${delayMs}ms (intento ${attempt + 1}/${maxRetries})`)

      // Esperar antes de reintentar
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw new Error(`Máximo de reintentos (${maxRetries}) alcanzado para ${endpoint}`)
}
