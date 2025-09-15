// Security utilities for input sanitization and validation

export function generateSecureId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Sanitize input for logging to prevent log injection
 */
export function sanitizeForLog(input: string): string {
  if (typeof input !== 'string') {
    return String(input).substring(0, 500)
  }
  
  return input
    .replace(/[\r\n\t]/g, ' ') // Remove newlines and tabs
    .replace(/[<>\"'`\\]/g, '') // Remove potentially dangerous characters
    .substring(0, 500) // Limit length
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Validate and sanitize file paths to prevent path traversal
 */
export function sanitizePath(path: string): string {
  if (typeof path !== 'string') {
    throw new Error('Invalid path type')
  }
  
  // Remove dangerous characters and sequences
  const sanitized = path
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .replace(/^\/+/, '') // Remove leading slashes
    .substring(0, 255) // Limit length
  
  if (!sanitized || sanitized.includes('..')) {
    throw new Error('Invalid file path')
  }
  
  return sanitized
}

/**
 * Validate origin for cross-origin communications
 */
export function validateOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin || typeof origin !== 'string') {
    return false
  }
  
  return allowedOrigins.includes(origin)
}

/**
 * Sanitize object for safe serialization
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (typeof obj === 'string') {
    return sanitizeForLog(obj)
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map(item => sanitizeObject(item))
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {}
    const allowedKeys = Object.keys(obj).slice(0, 50) // Limit object size
    
    for (const key of allowedKeys) {
      if (typeof key === 'string' && key.length < 100) {
        sanitized[sanitizeForLog(key)] = sanitizeObject(obj[key])
      }
    }
    
    return sanitized
  }
  
  return String(obj).substring(0, 500)
}