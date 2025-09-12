/**
 * Sanitizes user input for logging to prevent log injection
 */
export function sanitizeForLog(input: string): string {
  return input.replace(/[\r\n\t]/g, ' ').substring(0, 100)
}

/**
 * Sanitizes user input for display to prevent XSS
 */
export function sanitizeForDisplay(input: string): string {
  if (typeof input !== 'string') {
    return String(input)
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\\/g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .trim()
}