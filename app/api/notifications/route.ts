import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const unreadOnly = searchParams.get("unread_only") === "true"
    const offset = (page - 1) * limit

    let query = supabase.from("notifications").select("*").eq("user_id", user.id)

    if (unreadOnly) {
      query = query.is("read_at", null)
    }

    const { data: notifications, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { notificationIds, markAllAsRead } = await request.json()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id)

    if (markAllAsRead) {
      query = query.is("read_at", null)
    } else if (notificationIds && Array.isArray(notificationIds)) {
      query = query.in("id", notificationIds)
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
