import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface HealthCheck {
  service: string
  status: "healthy" | "unhealthy" | "degraded"
  responseTime?: number
  error?: string
}

export async function GET() {
  const checks: HealthCheck[] = []
  const startTime = Date.now()

  // Database health check
  try {
    const dbStart = Date.now()
    const supabase = await createClient()
    await supabase.from("institutions").select("id").limit(1).single()
    checks.push({
      service: "database",
      status: "healthy",
      responseTime: Date.now() - dbStart,
    })
  } catch (error) {
    checks.push({
      service: "database",
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }

  // Storage health check
  try {
    const storageStart = Date.now()
    const supabase = await createClient()
    await supabase.storage.from("documents").list("", { limit: 1 })
    checks.push({
      service: "storage",
      status: "healthy",
      responseTime: Date.now() - storageStart,
    })
  } catch (error) {
    checks.push({
      service: "storage",
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }

  // Environment variables check
  const requiredEnvVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]

  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar])

  if (missingEnvVars.length === 0) {
    checks.push({
      service: "environment",
      status: "healthy",
    })
  } else {
    checks.push({
      service: "environment",
      status: "unhealthy",
      error: `Missing environment variables: ${missingEnvVars.join(", ")}`,
    })
  }

  const overallStatus = checks.every((check) => check.status === "healthy")
    ? "healthy"
    : checks.some((check) => check.status === "unhealthy")
      ? "unhealthy"
      : "degraded"

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: Date.now() - startTime,
    version: process.env.npm_package_version || "unknown",
    environment: process.env.NODE_ENV,
    checks,
  }

  const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
}
