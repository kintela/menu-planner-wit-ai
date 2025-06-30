// Rate limiter simplificado para v0
interface RateLimitOptions {
  endpoint: string
  maxRetries?: number
  baseDelay?: number
}

const requestCounts = new Map<string, { count: number; resetTime: number }>()

export const safeQuery = async <T>(\
  queryFn: () => Promise<T>,\
  options: RateLimitOptions\
)
: Promise<T> =>
{
  const { endpoint, maxRetries = 3, baseDelay = 1000 } = options

  // Verificar rate limit
  const now = Date.now()
  const limit = requestCounts.get(endpoint)

  if (limit && now < limit.resetTime && limit.count >= 10) {
    console.warn(`Rate limit alcanzado para ${endpoint}, esperando...`)
    await new Promise((resolve) => setTimeout(resolve, limit.resetTime - now))
  }

  // Actualizar contador
  if (!limit || now >= limit.resetTime) {
    requestCounts.set(endpoint, { count: 1, resetTime: now + 60000 }) // Reset cada minuto
  } else {
    limit.count++
  }

  // Ejecutar query con reintentos
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn()
      return result;
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.warn(`Intento ${attempt + 1} falló para ${endpoint}, reintentando en ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
