import { updateSession } from "@/lib/supabase/middleware"
import { securityMiddleware } from "@/lib/middleware/security"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Apply security middleware first
  const securityResponse = await securityMiddleware(request)
  if (securityResponse.status !== 200) {
    return securityResponse
  }

  // Then apply Supabase session middleware
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
