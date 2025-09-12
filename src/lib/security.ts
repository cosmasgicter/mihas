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

  // Content Security Policy headers for production
  getCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
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
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}

async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return 'unknown'
  }
}