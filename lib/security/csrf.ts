import { createHash, randomBytes } from "crypto"

export function generateCSRFToken(): string {
  return randomBytes(32).toString("hex")
}

export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) {
    return false
  }

  // Simple HMAC-based verification
  const expectedToken = createHash("sha256")
    .update(sessionToken + process.env.CSRF_SECRET || "default")
    .digest("hex")

  return token === expectedToken
}

export function createCSRFToken(sessionToken: string): string {
  return createHash("sha256")
    .update(sessionToken + process.env.CSRF_SECRET || "default")
    .digest("hex")
}
