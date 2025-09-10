import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const formData = await request.formData()
    const applicationId = formData.get("application_id") as string
    const documentType = formData.get("document_type") as string
    const file = formData.get("file") as File

    if (!applicationId || !documentType || !file) {
      return NextResponse.json({ error: "Application ID, document type, and file are required" }, { status: 400 })
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type must be PDF, JPG, PNG, DOC, or DOCX" }, { status: 400 })
    }

    // Verify application ownership
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select("id, applicant_id, status")
      .eq("id", applicationId)
      .eq("applicant_id", user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    if (application.status === "matriculated") {
      return NextResponse.json({ error: "Cannot upload documents to matriculated applications" }, { status: 400 })
    }

    // Generate file path and checksum
    const fileExtension = file.name.split(".").pop()
    const fileName = `${documentType}_${Date.now()}.${fileExtension}`
    const filePath = `${user.id}/${applicationId}/${fileName}`

    // Calculate checksum
    const buffer = await file.arrayBuffer()
    const checksum = crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex")

    // Check for duplicate document type (remove existing if found)
    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id, file_path")
      .eq("application_id", applicationId)
      .eq("document_type", documentType)
      .single()

    if (existingDoc) {
      // Delete existing file from storage
      await supabase.storage.from("documents").remove([existingDoc.file_path])

      // Delete existing document record
      await supabase.from("documents").delete().eq("id", existingDoc.id)
    }

    // Upload file to storage
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Create document record
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        application_id: applicationId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        checksum,
        verdict: "pending",
      })
      .select()
      .single()

    if (docError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from("documents").remove([filePath])
      return NextResponse.json({ error: "Failed to create document record" }, { status: 500 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
