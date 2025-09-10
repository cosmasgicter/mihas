import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const institutionId = searchParams.get("institution_id")
    const includeIntakes = searchParams.get("include_intakes") === "true"

    let query = supabase
      .from("programs")
      .select(`
        *,
        institution:institutions(*),
        ${includeIntakes ? "intakes:program_intakes(*)" : ""}
      `)
      .eq("is_active", true)

    if (institutionId) {
      query = query.eq("institution_id", institutionId)
    }

    const { data: programs, error } = await query.order("name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ programs })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
