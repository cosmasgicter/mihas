import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json()

    // Validate metric data
    if (!metric.name || typeof metric.value !== "number") {
      return NextResponse.json({ error: "Invalid metric data" }, { status: 400 })
    }

    const supabase = await createClient()

    // Store web vitals data
    await supabase.from("web_vitals").insert({
      metric_name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      metric_id: metric.id,
      user_agent: request.headers.get("user-agent"),
      url: request.headers.get("referer"),
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to store web vitals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
