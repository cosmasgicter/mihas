// Comprehensive security configuration for MIHAS/KATC application system
import { sanitizeForLog } from './security'

export interface SecurityConfig {
  rateLimit: {
    maxRequests: number
    windowMinutes: number
    blockDurationMinutes: number
  }
  fileUpload: {
    maxSizeBytes: number
    allowedTypes: string[]
    scanForMalware: boolean
  }
  session: {
    timeoutMinutes: number
    refreshThresholdMinutes: number
    maxConcurrentSessions: number
  }
  validation: {
    maxInputLength: number
    allowedCharacters: RegExp
    sanitizeHtml: boolean
  }
  audit: {
    logAllActions: boolean
    retentionDays: number
    sensitiveFields: string[]
  }
}

export const SECURITY_CONFIG: SecurityConfig = {
  rateLimit: {
    maxRequests: 100,
    windowMinutes: 60,
    blockDurationMinutes: 15
  },
  fileUpload: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    scanForMalware: true
  },
  session: {
    timeoutMinutes: 30,
    refreshThresholdMinutes: 5,
    maxConcurrentSessions: 3
  },
  validation: {
    maxInputLength: 5000,
    allowedCharacters: /^[a-zA-Z0-9\s\-_.@#$%&*()+=\[\]{}|\\:";'<>?,./!~`]*$/,
    sanitizeHtml: true
  },
  audit: {
    logAllActions: true,
    retentionDays: 90,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'nrc_number', 'passport_number']
  }
}

export class SecurityValidator {
  static validateInput(input: string, maxLength?: number): boolean {
    if (!input) return true
    
    const limit = maxLength || SECURITY_CONFIG.validation.maxInputLength
    if (input.length > limit) {
      console.warn(`Input exceeds maximum length: ${sanitizeForLog(String(input.length))} > ${limit}`)
      return false
    }
    
    if (!SECURITY_CONFIG.validation.allowedCharacters.test(input)) {
      console.warn('Input contains invalid characters')
      return false
    }
    
    return true
  }
  
  static sanitizeInput(input: string): string {
    if (!input) return ''
    
    // Remove dangerous patterns
    let sanitized = input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim()
    
    // Limit length
    if (sanitized.length > SECURITY_CONFIG.validation.maxInputLength) {
      sanitized = sanitized.substring(0, SECURITY_CONFIG.validation.maxInputLength)
    }
    
    return sanitized
  }
  
  static validateFileUpload(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > SECURITY_CONFIG.fileUpload.maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds limit: ${Math.round(file.size / 1024 / 1024)}MB > ${Math.round(SECURITY_CONFIG.fileUpload.maxSizeBytes / 1024 / 1024)}MB`
      }
    }
    
    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !SECURITY_CONFIG.fileUpload.allowedTypes.includes(extension)) {
      return {
        valid: false,
        error: `File type not allowed: ${extension}. Allowed types: ${SECURITY_CONFIG.fileUpload.allowedTypes.join(', ')}`
      }
    }
    
    // Check file name for dangerous patterns
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return {
        valid: false,
        error: 'Invalid file name'
      }
    }
    
    return { valid: true }
  }
  
  static validateEmail(email: string): boolean {
    if (!email) return false
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && 
           email.length <= 254 && 
           !email.includes('..') &&
           this.validateInput(email)
  }
  
  static validatePhone(phone: string): boolean {
    if (!phone) return false
    
    // Zambian phone number format: +260XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+260|0)[0-9]{9}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }
  
  static validateNRC(nrc: string): boolean {
    if (!nrc) return false
    
    // Zambian NRC format: XXXXXX/XX/X
    const nrcRegex = /^[0-9]{6}\/[0-9]{2}\/[0-9]$/
    return nrcRegex.test(nrc)
  }
  
  static validateGrade(grade: number): boolean {
    // Zambian grading system: 1-9 (1 is best, 9 is worst)
    return Number.isInteger(grade) && grade >= 1 && grade <= 9
  }
}

export class SecurityAuditor {
  private static sensitiveDataRegex = new RegExp(
    SECURITY_CONFIG.audit.sensitiveFields.join('|'), 
    'gi'
  )
  
  static sanitizeForAudit(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data)
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForAudit(item))
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]'
        } else {
          sanitized[key] = this.sanitizeForAudit(value)
        }
      }
      return sanitized
    }
    
    return data
  }
  
  private static sanitizeString(str: string): string {
    // Redact sensitive patterns
    return str.replace(this.sensitiveDataRegex, '[REDACTED]')
  }
  
  private static isSensitiveField(fieldName: string): boolean {
    return SECURITY_CONFIG.audit.sensitiveFields.some(
      sensitive => fieldName.toLowerCase().includes(sensitive.toLowerCase())
    )
  }
  
  static async logSecurityEvent(
    event: string, 
    details: any, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      const sanitizedDetails = this.sanitizeForAudit(details)
      const logEntry = {
        timestamp: new Date().toISOString(),
        event: sanitizeForLog(event),
        severity,
        details: sanitizedDetails,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      }
      
      // Log to console (in production, this would go to a security monitoring system)
      console.warn('SECURITY EVENT:', logEntry)
      
      // In production, send to security monitoring service
      // await sendToSecurityMonitoring(logEntry)
    } catch (error) {
      console.error('Failed to log security event:', sanitizeForLog(String(error)))
    }
  }
}

export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>()
  
  static checkRateLimit(identifier: string): boolean {
    const now = Date.now()
    const windowMs = SECURITY_CONFIG.rateLimit.windowMinutes * 60 * 1000
    
    const record = this.requests.get(identifier)
    
    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return true
    }
    
    if (record.count >= SECURITY_CONFIG.rateLimit.maxRequests) {
      SecurityAuditor.logSecurityEvent(
        'rate_limit_exceeded',
        { identifier, count: record.count },
        'medium'
      )
      return false
    }
    
    record.count++
    return true
  }
  
  static getRemainingRequests(identifier: string): number {
    const record = this.requests.get(identifier)
    if (!record || Date.now() > record.resetTime) {
      return SECURITY_CONFIG.rateLimit.maxRequests
    }
    
    return Math.max(0, SECURITY_CONFIG.rateLimit.maxRequests - record.count)
  }
  
  static cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key)
      }
    }
  }
}

// Initialize cleanup interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    RateLimiter.cleanup()
  }, 5 * 60 * 1000) // Cleanup every 5 minutes
}

export default {
  SECURITY_CONFIG,
  SecurityValidator,
  SecurityAuditor,
  RateLimiter
}