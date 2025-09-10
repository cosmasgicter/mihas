interface ErrorContext {
  userId?: string
  action?: string
  metadata?: Record<string, any>
}

export function logError(error: Error, context?: ErrorContext) {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("[Error]", error.message, {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    })
  }

  // In production, you could send to your preferred logging service
  // For now, we'll just log to console
  console.error("Application Error:", {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}

export function logMessage(message: string, level: "info" | "warn" | "error" = "info", context?: ErrorContext) {
  const logData = {
    message,
    level,
    context,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  }

  switch (level) {
    case "error":
      console.error("[App Error]", logData)
      break
    case "warn":
      console.warn("[App Warning]", logData)
      break
    default:
      console.log("[App Info]", logData)
  }
}

export function setUserContext(user: { id: string; email?: string; role?: string }) {
  // Store user context for error logging
  if (typeof window !== "undefined") {
    window.__userContext = user
  }
}

// Helper to get user context
export function getUserContext() {
  if (typeof window !== "undefined") {
    return window.__userContext
  }
  return null
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __userContext?: { id: string; email?: string; role?: string }
  }
}
