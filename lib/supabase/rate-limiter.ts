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

const rateLimitMap = new Map<string, RateLimitState>()
const WINDOW_SIZE = 60000 // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 50

function getRateLimitState(endpoint: string): RateLimitState {
  const now = Date.now()
  let state = rateLimitMap.get(endpoint)

  if (!state || now - state.lastReset > WINDOW_SIZE) {
    state = {
      requests: 0,
      lastReset: now,
      blocked: false,
    }
    rateLimitMap.set(endpoint, state)
  }

  return state
}

function isRateLimited(endpoint: string): boolean {
  const state = getRateLimitState(endpoint)
  return state.requests >= MAX_REQUESTS_PER_WINDOW
}

function incrementRequests(endpoint: string): void {
  const state = getRateLimitState(endpoint)
  state.requests++

  if (state.requests >= MAX_REQUESTS_PER_WINDOW) {
    state.blocked = true
    console.warn(`🚫 Rate limit alcanzado para ${endpoint}`)
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function safeQuery<T>(queryFn: () => Promise<T>, config: RateLimitConfig): Promise<T> {
  const { endpoint, maxRetries = 3, baseDelay = 1000 } = config

  if (isRateLimited(endpoint)) {
    console.warn(`⏳ Rate limited: ${endpoint}`)
    throw new Error(`Rate limit exceeded for ${endpoint}`)
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      incrementRequests(endpoint)
      const result = await queryFn()

      if (attempt > 0) {
        console.log(`✅ Éxito en intento ${attempt + 1} para ${endpoint}`)
      }

      return result
    } catch (error) {
      lastError = error as Error
      console.warn(`❌ Intento ${attempt + 1} falló para ${endpoint}:`, error)

      if (attempt < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, attempt)
        console.log(`⏳ Esperando ${delayMs}ms antes del siguiente intento...`)
        await delay(delayMs)
      }
    }
  }

  throw lastError || new Error(`Failed after ${maxRetries + 1} attempts`)
}
