/**
 * Security configuration and Content Security Policy setup
 * Prevents code injection vulnerabilities including Function() constructor usage
 */

import { initializeSecurityPatches } from './securityPatches'

/**
 * Content Security Policy configuration
 */
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite in development
    "https://challenges.cloudflare.com", // Cloudflare Turnstile
    "https://*.supabase.co"
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind CSS
    "https://fonts.googleapis.com"
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com"
  ],
  'img-src': [
    "'self'",
    "data:",
    "blob:",
    "https://*.supabase.co"
  ],
  'connect-src': [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co"
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
}

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive.replace(/-/g, '-')
      }
      return `${directive.replace(/-/g, '-')} ${sources.join(' ')}`
    })
    .join('; ')
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': generateCSPHeader(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

/**
 * Disable dangerous global functions to prevent code injection
 */
export function disableDangerousFunctions(): void {
  if (typeof window !== 'undefined') {
    // Override Function constructor to prevent code injection
    if (window.Function) {
      window.Function = function(...args: any[]) {
        // SECURE: This is a security override to block Function constructor
        console.warn('Function constructor usage blocked for security')
        throw new Error('Function constructor is disabled for security reasons')
      } as any
    }
    
    // Override eval to prevent code injection
    if (window.eval) {
      window.eval = function(code: string) {
        // SECURE: This is a security override to block eval usage
        console.warn('eval() usage blocked for security')
        throw new Error('eval() is disabled for security reasons')
      }
    }
  }
}

/**
 * Input sanitization utilities
 */
export class SecuritySanitizer {
  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHTML(html: string): string {
    const div = document.createElement('div')
    div.textContent = html
    return div.innerHTML
  }
  
  /**
   * Sanitize user input for safe display
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>\"'&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        }
        return entities[match] || match
      })
      .trim()
      .substring(0, 1000) // Limit length
  }
  
  /**
   * Sanitize URL to prevent javascript: and data: schemes
   */
  static sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url)
      const allowedProtocols = ['http:', 'https:', 'mailto:']
      
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error('Protocol not allowed')
      }
      
      return urlObj.toString()
    } catch {
      return '#'
    }
  }
  
  /**
   * Validate and sanitize JSON input
   */
  static sanitizeJSON(jsonString: string): any {
    try {
      // Remove potentially dangerous patterns
      const cleaned = jsonString
        .replace(/__proto__/g, '')
        .replace(/constructor/g, '')
        .replace(/prototype/g, '')
      
      const parsed = JSON.parse(cleaned)
      
      // Remove dangerous properties from parsed object
      if (parsed && typeof parsed === 'object') {
        this.removeDangerousProperties(parsed)
      }
      
      return parsed
    } catch (error) {
      throw new Error('Invalid JSON input')
    }
  }
  
  /**
   * Recursively remove dangerous properties from objects
   */
  private static removeDangerousProperties(obj: any): void {
    if (!obj || typeof obj !== 'object') return
    
    const dangerousProps = ['__proto__', 'constructor', 'prototype']
    
    for (const prop of dangerousProps) {
      delete obj[prop]
    }
    
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        this.removeDangerousProperties(value)
      }
    }
  }
}

/**
 * Rate limiting for security
 */
export class RateLimiter {
  private static attempts: Map<string, number[]> = new Map()
  
  /**
   * Check if action is rate limited
   */
  static isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs)
    
    if (validAttempts.length >= maxAttempts) {
      return true
    }
    
    // Add current attempt
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    
    return false
  }
  
  /**
   * Clear rate limit for a key
   */
  static clearRateLimit(key: string): void {
    this.attempts.delete(key)
  }
}

/**
 * Initialize security measures
 */
export function initializeSecurity(): void {
  // Disable dangerous functions
  disableDangerousFunctions()
  
  // Apply security patches
  initializeSecurityPatches()
  
  // Set up CSP if in browser environment
  if (typeof document !== 'undefined') {
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = generateCSPHeader()
    document.head.appendChild(meta)
  }
  
  console.log('Security measures initialized')
}