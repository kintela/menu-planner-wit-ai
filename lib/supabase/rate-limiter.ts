interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  retryAfterMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
  lastRequest: number
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests = 10
  private readonly windowMs = 60000 // 1 minuto

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now()
    const requests = this.requests.get(key) || []

    // Limpiar requests antiguos
    const validRequests = requests.filter((time) => now - time < this.windowMs)

    if (validRequests.length >= this.maxRequests) {
      return false
    }

    validRequests.push(now)
    this.requests.set(key, validRequests)
    return true
  }

  async waitForSlot(key: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })
  }

  getRemainingRequests(key: string): number {
    const requests = this.requests.get(key) || []
    const now = Date.now()
    const validRequests = requests.filter((time) => now - time < this.windowMs)
    return Math.max(0, this.maxRequests - validRequests.length)
  }

  getResetTime(key: string): number {
    const requests = this.requests.get(key) || []
    const now = Date.now()
    const validRequests = requests.filter((time) => now - time < this.windowMs)
    return validRequests.length >= this.maxRequests ? now + this.windowMs : now
  }
}

export const rateLimiter = new RateLimiter()

export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    endpoint: string
    maxRetries?: number
    baseDelay?: number
  },
): Promise<T> {
  const { endpoint, maxRetries = 3, baseDelay = 1000 } = options

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Verificar rate limit
      if (!(await rateLimiter.checkLimit(endpoint))) {
        console.log(`⏳ Rate limit alcanzado para ${endpoint}, esperando...`)
        await rateLimiter.waitForSlot(endpoint)
      }

      // Ejecutar consulta
      const result = await queryFn()
      console.log(`✅ Consulta exitosa para ${endpoint} en intento ${attempt}`)
      return result
    } catch (error) {
      console.error(`❌ Error en ${endpoint}, intento ${attempt}/${maxRetries}:`, error)

      if (attempt === maxRetries) {
        throw error
      }

      // Esperar antes del siguiente intento (backoff exponencial)
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error(`Falló después de ${maxRetries} intentos`)
}
