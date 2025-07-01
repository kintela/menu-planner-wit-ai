interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }) {
    this.config = config
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      })
      return true
    }

    if (entry.count >= this.config.maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  async waitForSlot(key: string): Promise<void> {
    const entry = this.limits.get(key)
    if (entry && Date.now() < entry.resetTime) {
      const waitTime = entry.resetTime - Date.now()
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 5000)))
    }
  }

  reset(key?: string): void {
    if (key) {
      this.limits.delete(key)
    } else {
      this.limits.clear()
    }
  }
}

export const rateLimiter = new RateLimiter()
