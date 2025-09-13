import { supabase } from './supabase'

export interface SecurityConfig {
  maxLoginAttempts: number
  lockoutDuration: number // in minutes
  passwordMinLength: number
  requireSpecialChars: boolean
}

const DEFAULT_CONFIG: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  passwordMinLength: 8,
  requireSpecialChars: true
}

class SecurityManager {
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>()

  async checkLoginAttempts(email: string): Promise<{ allowed: boolean; remainingAttempts?: number; lockoutTime?: number }> {
    const attempts = this.loginAttempts.get(email)
    const now = Date.now()

    if (!attempts) {
      return { allowed: true }
    }

    // Check if lockout period has expired
    const lockoutExpiry = attempts.lastAttempt + (DEFAULT_CONFIG.lockoutDuration * 60 * 1000)
    if (now > lockoutExpiry) {
      this.loginAttempts.delete(email)
      return { allowed: true }
    }

    // Check if max attempts exceeded
    if (attempts.count >= DEFAULT_CONFIG.maxLoginAttempts) {
      const remainingLockout = Math.ceil((lockoutExpiry - now) / 60000)
      return { 
        allowed: false, 
        lockoutTime: remainingLockout 
      }
    }

    return { 
      allowed: true, 
      remainingAttempts: DEFAULT_CONFIG.maxLoginAttempts - attempts.count 
    }
  }

  recordFailedLogin(email: string): void {
    const now = Date.now()
    const attempts = this.loginAttempts.get(email)

    if (attempts) {
      this.loginAttempts.set(email, {
        count: attempts.count + 1,
        lastAttempt: now
      })
    } else {
      this.loginAttempts.set(email, {
        count: 1,
        lastAttempt: now
      })
    }
  }

  clearFailedLogins(email: string): void {
    this.loginAttempts.delete(email)
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (password.length < DEFAULT_CONFIG.passwordMinLength) {
      errors.push(`Password must be at least ${DEFAULT_CONFIG.passwordMinLength} characters long`)
    }

    if (DEFAULT_CONFIG.requireSpecialChars) {
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number')
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Generate nonce for inline scripts/styles
  generateNonce(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
  }

  // Content Security Policy headers for production
  getCSPHeaders(nonce?: string): Record<string, string> {
    const nonceDirective = nonce ? `'nonce-${nonce}'` : ''
    
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        // Removed 'unsafe-inline' and 'unsafe-eval' - use nonces for inline content
        `script-src 'self' ${nonceDirective} https://challenges.cloudflare.com`,
        `style-src 'self' ${nonceDirective} https://fonts.googleapis.com`,
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        // Expected external sources documented:
        // - Supabase: Database and auth services
        // - Cloudflare: Turnstile CAPTCHA
        // - Google Fonts: Typography
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-src https://challenges.cloudflare.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  }

  // Rate limiting for API calls
  private rateLimits = new Map<string, { count: number; resetTime: number }>()

  checkRateLimit(key: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now()
    const limit = this.rateLimits.get(key)

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (limit.count >= maxRequests) {
      return false
    }

    limit.count++
    return true
  }
}

export const securityManager = new SecurityManager()

// Audit logging for security events
export async function logSecurityEvent(
  event: string, 
  userId?: string, 
  details?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      actor_id: userId,
      action: event,
      entity_type: 'security',
      entity_id: userId,
      changes: details,
      ip_address: await ipLookupService.getClientIP(),
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

interface IPLookupConfig {
  enabled: boolean
  service: string
  timeout: number
}

class IPLookupService {
  private config: IPLookupConfig

  constructor() {
    this.config = {
      enabled: import.meta.env.VITE_IP_LOOKUP_ENABLED !== 'false',
      service: import.meta.env.VITE_IP_LOOKUP_SERVICE || 'https://api.ipify.org?format=json',
      timeout: parseInt(import.meta.env.VITE_IP_LOOKUP_TIMEOUT || '3000')
    }
  }

  async getClientIP(): Promise<string> {
    if (!this.config.enabled) {
      return 'disabled'
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
      
      const response = await fetch(this.config.service, {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const data = await response.json()
      return data.ip || 'unknown'
    } catch {
      return 'unknown'
    }
  }
}

const ipLookupService = new IPLookupService()