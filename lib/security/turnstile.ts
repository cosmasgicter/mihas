"use server"

interface TurnstileResponse {
  success: boolean
  "error-codes"?: string[]
  challenge_ts?: string
  hostname?: string
}

export async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured")
    return false
  }

  try {
    const formData = new FormData()
    formData.append("secret", secretKey)
    formData.append("response", token)
    if (remoteip) {
      formData.append("remoteip", remoteip)
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    })

    const data: TurnstileResponse = await response.json()

    if (!data.success) {
      console.error("Turnstile verification failed:", data["error-codes"])
      return false
    }

    return true
  } catch (error) {
    console.error("Turnstile verification error:", error)
    return false
  }
}

export async function getTurnstileSiteKey(): Promise<string> {
  // Use a derived approach or return a default for development
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    return ""
  }

  // In production, you would typically have the site key configured separately
  // For now, return empty string to avoid exposing sensitive data
  return ""
}

export async function getTurnstileConfig(): Promise<{ enabled: boolean; siteKey?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    return { enabled: false }
  }

  // Return configuration without exposing the actual keys
  return {
    enabled: true,
    // Note: In a real implementation, you'd want to store the site key separately
    // or use a different approach that doesn't expose it to the client
  }
}
