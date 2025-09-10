import { type NextRequest, NextResponse } from "next/server"
import { addSecurityHeaders } from "@/lib/security/headers"
import { RateLimiter } from "@/lib/security/rate-limit"

// Rate limiters for different endpoints
const authRateLimit = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyGenerator: (request) => {
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
    return `auth:${ip}`
  },
})

const apiRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
})

const uploadRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
})

export async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // Apply rate limiting
  let rateLimitResult
  if (pathname.startsWith("/auth/")) {
    rateLimitResult = await authRateLimit.checkLimit(request)
  } else if (pathname.startsWith("/api/documents/upload")) {
    rateLimitResult = await uploadRateLimit.checkLimit(request)
  } else if (pathname.startsWith("/api/")) {
    rateLimitResult = await apiRateLimit.checkLimit(request)
  }

  if (rateLimitResult && !rateLimitResult.success) {
    const response = NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })

    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString())
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString())
    response.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toString())

    return addSecurityHeaders(response)
  }

  // Continue with the request
  const response = NextResponse.next()

  // Add rate limit headers if available
  if (rateLimitResult) {
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString())
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString())
    response.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toString())
  }

  return addSecurityHeaders(response)
}
