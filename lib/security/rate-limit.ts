import { createClient } from "@/lib/supabase/server"

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: Request) => string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  async checkLimit(request: Request): Promise<RateLimitResult> {
    const key = this.config.keyGenerator ? this.config.keyGenerator(request) : this.getDefaultKey(request)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      const supabase = await createClient()

      // Clean up old entries
      await supabase.from("rate_limits").delete().lt("created_at", new Date(windowStart).toISOString())

      // Count current requests in window
      const { count } = await supabase
        .from("rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("key", key)
        .gte("created_at", new Date(windowStart).toISOString())

      const currentCount = count || 0

      if (currentCount >= this.config.maxRequests) {
        return {
          success: false,
          limit: this.config.maxRequests,
          remaining: 0,
          resetTime: windowStart + this.config.windowMs,
        }
      }

      // Record this request
      await supabase.from("rate_limits").insert({
        key,
        created_at: new Date(now).toISOString(),
      })

      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - currentCount - 1,
        resetTime: windowStart + this.config.windowMs,
      }
    } catch (error) {
      console.error("Rate limiting error:", error)
      // Fail open - allow request if rate limiting fails
      return {
        success: true,
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      }
    }
  }

  private getDefaultKey(request: Request): string {
    const url = new URL(request.url)
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
    return `${ip}:${url.pathname}`
  }
}

// Create rate limit table
export const createRateLimitTable = `
  CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON rate_limits(key, created_at);
`
