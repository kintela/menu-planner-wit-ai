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
  private limits: Map<string, RateLimitEntry> = new Map()
  private config: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000, // 1 minuto
    retryAfterMs: 5000, // 5 segundos
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
        lastRequest: now,
      })
      return true
    }

    // Reset si ha pasado la ventana de tiempo
    if (now >= entry.resetTime) {
      entry.count = 1
      entry.resetTime = now + this.config.windowMs
      entry.lastRequest = now
      return true
    }

    // Verificar si excede el límite
    if (entry.count >= this.config.maxRequests) {
      return false
    }

    entry.count++
    entry.lastRequest = now
    return true
  }

  async waitForSlot(key: string): Promise<void> {
    const entry = this.limits.get(key)
    if (!entry) return

    const waitTime = Math.max(0, entry.resetTime - Date.now())
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, this.config.retryAfterMs)))
    }
  }

  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key)
    if (!entry) return this.config.maxRequests

    const now = Date.now()
    if (now >= entry.resetTime) {
      return this.config.maxRequests
    }

    return Math.max(0, this.config.maxRequests - entry.count)
  }

  getResetTime(key: string): number {
    const entry = this.limits.get(key)
    return entry ? entry.resetTime : Date.now()
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
