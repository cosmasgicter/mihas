export interface DeploymentConfig {
  environment: "development" | "staging" | "production"
  database: {
    url: string
    poolSize: number
    ssl: boolean
  }
  storage: {
    bucket: string
    region: string
  }
  security: {
    corsOrigins: string[]
    rateLimiting: boolean
    turnstileEnabled: boolean
  }
  monitoring: {
    analyticsEnabled: boolean
    performanceMonitoring: boolean
  }
  features: {
    maintenanceMode: boolean
    registrationOpen: boolean
    emailVerificationRequired: boolean
  }
}

export function getDeploymentConfig(): DeploymentConfig {
  const environment = (process.env.NODE_ENV as DeploymentConfig["environment"]) || "development"

  return {
    environment,
    database: {
      url: process.env.POSTGRES_URL || "",
      poolSize: Number.parseInt(process.env.DB_POOL_SIZE || "10"),
      ssl: environment === "production",
    },
    storage: {
      bucket: "documents",
      region: process.env.SUPABASE_REGION || "us-east-1",
    },
    security: {
      corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
      rateLimiting: environment === "production",
      turnstileEnabled: !!process.env.TURNSTILE_SECRET_KEY,
    },
    monitoring: {
      analyticsEnabled: environment === "production",
      performanceMonitoring: environment === "production",
    },
    features: {
      maintenanceMode: process.env.MAINTENANCE_MODE === "true",
      registrationOpen: process.env.REGISTRATION_OPEN !== "false",
      emailVerificationRequired: process.env.EMAIL_VERIFICATION_REQUIRED !== "false",
    },
  }
}

export function validateDeploymentConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required environment variables
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]

  for (const envVar of required) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`)
    }
  }

  // Production-specific requirements
  if (process.env.NODE_ENV === "production") {
    const productionRequired = ["TURNSTILE_SECRET_KEY"]

    for (const envVar of productionRequired) {
      if (!process.env[envVar]) {
        errors.push(`Missing production environment variable: ${envVar}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
