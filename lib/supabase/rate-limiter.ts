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

  user_rating: 2, // Reducir límite para calificaciones de usuario
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

interface RateLimiterOptions {
  endpoint: string
  maxRetries?: number
  baseDelay?: number
}

type QueryFunction<T> = () => Promise<T>

// Simple rate limiter for v0 environment
export async function safeQuery<T>(queryFn: QueryFunction<T>, options: RateLimiterOptions): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000 } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn()
      return result
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`⏳ Retry ${attempt + 1}/${maxRetries} after ${delay}ms for ${options.endpoint}`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
