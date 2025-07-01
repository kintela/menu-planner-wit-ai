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
  const key = endpoint
  const current = requestCounts.get(key)

  if (current && current.count > 10 && now < current.resetTime) {
    console.warn(`Rate limit alcanzado para ${endpoint}`)
    await new Promise((resolve) => setTimeout(resolve, baseDelay))
  }

  // Actualizar contador
  if (!current || now >= current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + 60000 }) // Reset cada minuto
  } else {
    current.count++
  }

  // Ejecutar query con reintentos
  let lastError: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.warn(`Intento ${attempt + 1} falló, reintentando en ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
