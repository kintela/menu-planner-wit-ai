// Rate limiter simple para controlar las peticiones
interface RateLimitConfig {
  endpoint: string
  maxRetries?: number
  baseDelay?: number
}

interface RateLimitState {
  requests: number
  lastRequest: number
  blocked: boolean
}

const rateLimitMap = new Map<string, RateLimitState>()

export const safeQuery = async <T>(\
  queryFn: () => Promise<T>,\
  config: RateLimitConfig\
)
: Promise<T> =>
{
  const { endpoint, maxRetries = 3, baseDelay = 1000 } = config

  const now = Date.now()
  const state = rateLimitMap.get(endpoint) || { requests: 0, lastRequest: 0, blocked: false }

  // Reset counter every minute
  if (now - state.lastRequest > 60000) {
    state.requests = 0
    state.blocked = false
  }

  // Check if we're rate limited
  if (state.requests > 10) {
    state.blocked = true
    console.warn(`Rate limit reached for ${endpoint}`)
    throw new Error(`Rate limit exceeded for ${endpoint}`)
  }

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      state.requests++
      state.lastRequest = now
      rateLimitMap.set(endpoint, state)

      const result = await queryFn()

      // Reset on success
      if (state.blocked) {
        state.blocked = false
        state.requests = Math.max(0, state.requests - 2)
      }

      return result;
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`Retry ${attempt + 1}/${maxRetries} for ${endpoint} in ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
