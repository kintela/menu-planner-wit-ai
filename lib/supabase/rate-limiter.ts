/**
 * Utilidad para manejar rate limiting en Supabase
 */

// Estado de rate limiting por endpoint
const rateLimitState: Record<string, { lastRequest: number; requestCount: number; isBlocked: boolean }> = {}

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
  if (!rateLimitState[key]) {
    rateLimitState[key] = {
      lastRequest: now,
      requestCount: 1,
      isBlocked: false,
    }
    return false
  }

  const state = rateLimitState[key]

  // Resetear contador cada minuto
  if (now - state.lastRequest > 60000) {
    state.requestCount = 0
    state.isBlocked = false
  }

  // Incrementar contador
  state.requestCount++

  // Comprobar si excede el límite
  const shouldLimit = state.requestCount > limit
  if (shouldLimit) {
    state.isBlocked = true
  }
  return shouldLimit
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

interface RateLimitOptions {
  endpoint: string
  maxRetries?: number
  baseDelay?: number
}

type QueryFunction<T> = () => Promise<T>

// Simple rate limiter for v0 environment
export async function safeQuery<T>(queryFn: QueryFunction<T>, options: RateLimitOptions): Promise<T> {
  const { endpoint, maxRetries = 3, baseDelay = 1000 } = options

  // Inicializar estado si no existe
  if (!rateLimitState[endpoint]) {
    rateLimitState[endpoint] = {
      lastRequest: 0,
      requestCount: 0,
      isBlocked: false,
    }
  }

  const state = rateLimitState[endpoint]
  const now = Date.now()

  // Resetear contador cada minuto
  if (now - state.lastRequest > 60000) {
    state.requestCount = 0
    state.isBlocked = false
  }

  // Verificar si estamos bloqueados
  if (state.isBlocked) {
    console.warn(`Rate limit activo para ${endpoint}, usando delay`)
    await new Promise((resolve) => setTimeout(resolve, baseDelay))
  }

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Añadir delay entre intentos
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Reintento ${attempt} para ${endpoint} en ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      state.lastRequest = now
      state.requestCount++

      const result = await queryFn()

      // Resetear estado en caso de éxito
      if (state.requestCount > 5) {
        state.isBlocked = false
      }

      return result
    } catch (error: any) {
      lastError = error
      console.warn(`Error en intento ${attempt + 1} para ${endpoint}:`, error)

      // Si es un error de rate limiting, marcar como bloqueado
      if (error?.message?.includes("rate") || error?.status === 429) {
        state.isBlocked = true
      }

      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        break
      }
    }
  }

  throw lastError
}
