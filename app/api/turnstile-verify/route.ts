import { verifyTurnstile } from "@/lib/security/turnstile"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const remoteip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined

    const isValid = await verifyTurnstile(token, remoteip)

    return NextResponse.json({ success: isValid })
  } catch (error) {
    console.error("Turnstile verification error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
