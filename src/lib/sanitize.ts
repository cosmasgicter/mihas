export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  return input.replace(/[<>"'&]/g, '')
}

export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }
  return email.toLowerCase().trim()
}

export function sanitizeForLog(input: any): string {
  if (typeof input === 'string') {
    return input.replace(/[<>"'&]/g, '')
  }
  return JSON.stringify(input).replace(/[<>"'&]/g, '')
}

export function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  
  const sanitized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString)
  } catch {
    return fallback
  }
}

export function generateSecureId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  return input.replace(/<[^>]*>/g, '')
}

export function sanitizeForDisplay(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  return input.replace(/[<>"'&]/g, '')
}