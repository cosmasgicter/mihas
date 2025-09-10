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

    const status = searchParams.get("status")
    const institutionId = searchParams.get("institution_id")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Check user role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, institution_id")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .single()

    let query = supabase.from("applications").select(`
        *,
        program:programs(*),
        intake:program_intakes(*),
        institution:institutions(*),
        applicant:user_profiles(*)
      `)

    // Apply filters based on user role
    if (userRole?.role === "applicant") {
      query = query.eq("applicant_id", user.id)
    } else if (userRole?.role && ["admissions_officer", "registrar"].includes(userRole.role)) {
      query = query.eq("institution_id", userRole.institution_id)
    }
    // super_admin can see all applications

    if (status) {
      query = query.eq("status", status)
    }

    if (institutionId && userRole?.role === "super_admin") {
      query = query.eq("institution_id", institutionId)
    }

    const { data: applications, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ applications })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
