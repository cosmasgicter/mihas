import { createClient } from "@/lib/supabase/server"

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal"

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
  userId?: string
}

export class Logger {
  private static instance: Logger
  private isDevelopment = process.env.NODE_ENV === "development"

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  async log({ level, message, context, error, userId }: LogEntry) {
    // Console logging
    const logMessage = `[${level.toUpperCase()}] ${message}`
    const logData = { context, error: error?.message, stack: error?.stack, userId }

    switch (level) {
      case "debug":
        if (this.isDevelopment) console.debug(logMessage, logData)
        break
      case "info":
        console.info(logMessage, logData)
        break
      case "warn":
        console.warn(logMessage, logData)
        break
      case "error":
      case "fatal":
        console.error(logMessage, logData)
        break
    }

    // Store error logs in database for error and fatal levels
    if (level === "error" || level === "fatal") {
      try {
        const supabase = await createClient()
        await supabase.from("error_logs").insert({
          error_message: message,
          error_stack: error?.stack,
          user_id: userId,
          severity: level,
          context: context || {},
        })
      } catch (dbError) {
        console.error("Failed to store error log:", dbError)
      }
    }
  }

  debug(message: string, context?: Record<string, any>) {
    return this.log({ level: "debug", message, context })
  }

  info(message: string, context?: Record<string, any>) {
    return this.log({ level: "info", message, context })
  }

  warn(message: string, context?: Record<string, any>) {
    return this.log({ level: "warn", message, context })
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    return this.log({ level: "error", message, error, context })
  }

  fatal(message: string, error?: Error, context?: Record<string, any>) {
    return this.log({ level: "fatal", message, error, context })
  }
}

export const logger = Logger.getInstance()
