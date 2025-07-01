interface RateLimitConfig {
  endpoint: string
  maxRetries?: number
  baseDelay?: number
}

interface RateLimitState {
  requests: number
  lastReset: number
  blocked: boolean
}

class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map()
  private readonly maxRequestsPerMinute = 10
  private readonly blockDuration = 60000 // 1 minuto

  private getState(endpoint: string): RateLimitState {
    const now = Date.now()
    let state = this.limits.get(endpoint)

    if (!state) {
      state = { requests: 0, lastReset: now, blocked: false }
      this.limits.set(endpoint, state)
    }

    // Reset contador cada minuto
    if (now - state.lastReset > 60000) {
      state.requests = 0
      state.lastReset = now
      state.blocked = false
    }

    return state
  }

  async execute<T>(operation: () => Promise<T>, config: RateLimitConfig): Promise<T> {
    const { endpoint, maxRetries = 3, baseDelay = 1000 } = config
    const state = this.getState(endpoint)

    // Verificar si está bloqueado
    if (state.blocked) {
      throw new Error(`Rate limit exceeded for ${endpoint}. Try again later.`)
    }

    // Verificar límite de requests
    if (state.requests >= this.maxRequestsPerMinute) {
      state.blocked = true
      throw new Error(`Rate limit exceeded for ${endpoint}. Blocked for 1 minute.`)
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        state.requests++
        const result = await operation()
        return result
      } catch (error) {
        lastError = error as Error

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt)
          console.log(`Retry ${attempt + 1}/${maxRetries} for ${endpoint} in ${delay}ms`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error(`Failed after ${maxRetries} retries`)
  }
}

const rateLimiter = new RateLimiter()

export const safeQuery = async <T>(\
  operation: () => Promise<T>,\
  config: RateLimitConfig\
)
: Promise<T> =>
{
  return rateLimiter.execute(operation, config)
}
