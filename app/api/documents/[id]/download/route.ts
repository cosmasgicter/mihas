import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get document with application details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select(`
        *,
        application:applications(applicant_id, institution_id)
      `)
      .eq("id", id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check access permissions
    const isOwner = document.application.applicant_id === user.id

    if (!isOwner) {
      // Check if user is staff with access to this institution
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role, institution_id")
        .eq("user_id", user.id)
        .in("role", ["admissions_officer", "registrar", "super_admin"])
        .is("revoked_at", null)
        .single()

      if (
        !userRole ||
        (userRole.role !== "super_admin" && userRole.institution_id !== document.application.institution_id)
      ) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.file_path, 3600)

    if (urlError) {
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 })
    }

    return NextResponse.json({ downloadUrl: signedUrl.signedUrl })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
