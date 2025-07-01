interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private readonly maxRequests: number = 10
  private readonly windowMs: number = 60000 // 1 minuto

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return true
    }

    if (entry.count >= this.maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  async waitForSlot(key: string): Promise<void> {
    const entry = this.limits.get(key)
    if (entry && entry.count >= this.maxRequests) {
      const waitTime = entry.resetTime - Date.now()
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 5000)))
      }
    }
  }
}

export const rateLimiter = new RateLimiter()
