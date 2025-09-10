"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import type { DocumentVerdict } from "@/lib/types/database"

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  const applicationId = formData.get("application_id") as string
  const documentType = formData.get("document_type") as string
  const file = formData.get("file") as File

  if (!applicationId || !documentType || !file) {
    throw new Error("Application ID, document type, and file are required")
  }

  // Validate file
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error("File size must be less than 10MB")
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error("File type must be PDF, JPG, PNG, DOC, or DOCX")
  }

  // Verify application ownership
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, applicant_id, status")
    .eq("id", applicationId)
    .eq("applicant_id", user.id)
    .single()

  if (appError || !application) {
    throw new Error("Application not found")
  }

  if (application.status === "matriculated") {
    throw new Error("Cannot upload documents to matriculated applications")
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
    throw new Error("Failed to upload file: " + uploadError.message)
  }

  // Create document record
  const { error: docError } = await supabase.from("documents").insert({
    application_id: applicationId,
    document_type: documentType,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type,
    checksum,
    verdict: "pending" as DocumentVerdict,
  })

  if (docError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from("documents").remove([filePath])
    throw new Error("Failed to create document record: " + docError.message)
  }

  // Update application completeness score
  await updateApplicationCompleteness(applicationId)

  revalidatePath(`/applications/${applicationId}`)
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  // Get document with application details
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select(`
      *,
      application:applications(applicant_id, status)
    `)
    .eq("id", documentId)
    .single()

  if (docError || !document) {
    throw new Error("Document not found")
  }

  // Check ownership
  if (document.application.applicant_id !== user.id) {
    throw new Error("Access denied")
  }

  // Check if application allows document deletion
  if (["matriculated"].includes(document.application.status)) {
    throw new Error("Cannot delete documents from matriculated applications")
  }

  // Delete file from storage
  const { error: storageError } = await supabase.storage.from("documents").remove([document.file_path])

  if (storageError) {
    throw new Error("Failed to delete file: " + storageError.message)
  }

  // Delete document record
  const { error: deleteError } = await supabase.from("documents").delete().eq("id", documentId)

  if (deleteError) {
    throw new Error("Failed to delete document: " + deleteError.message)
  }

  // Update application completeness score
  await updateApplicationCompleteness(document.application_id)

  revalidatePath(`/applications/${document.application_id}`)
}

export async function verifyDocument(documentId: string, verdict: DocumentVerdict, rejectionReason?: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  // Check user permissions
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role, institution_id")
    .eq("user_id", user.id)
    .in("role", ["admissions_officer", "registrar", "super_admin"])
    .is("revoked_at", null)
    .single()

  if (!userRole) {
    throw new Error("Insufficient permissions")
  }

  // Get document with application details
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select(`
      *,
      application:applications(institution_id, applicant_id)
    `)
    .eq("id", documentId)
    .single()

  if (docError || !document) {
    throw new Error("Document not found")
  }

  // Check institution access
  if (userRole.role !== "super_admin" && userRole.institution_id !== document.application.institution_id) {
    throw new Error("Access denied for this institution")
  }

  // Update document verification
  const { error: updateError } = await supabase
    .from("documents")
    .update({
      verdict,
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: verdict === "rejected" ? rejectionReason : null,
    })
    .eq("id", documentId)

  if (updateError) {
    throw new Error("Failed to verify document: " + updateError.message)
  }

  // Update application completeness score
  await updateApplicationCompleteness(document.application_id)

  // Create notification for applicant
  const verdictMessages = {
    approved: "Your document has been approved.",
    rejected: `Your document has been rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
  }

  if (verdict !== "pending") {
    await supabase.from("notifications").insert({
      user_id: document.application.applicant_id,
      subject: `Document ${verdict.toUpperCase()}`,
      body: verdictMessages[verdict as keyof typeof verdictMessages] || `Document status updated to ${verdict}.`,
      action_url: `/applications/${document.application_id}`,
    })
  }

  revalidatePath("/admin/applications")
  revalidatePath(`/applications/${document.application_id}`)
}

async function updateApplicationCompleteness(applicationId: string) {
  const supabase = await createClient()

  // Get application with program and documents
  const { data: application, error } = await supabase
    .from("applications")
    .select(`
      id,
      program:programs(required_documents),
      documents(verdict)
    `)
    .eq("id", applicationId)
    .single()

  if (error || !application) {
    return
  }

  const requiredDocs = application.program.required_documents || []
  const approvedDocs = application.documents.filter((doc) => doc.verdict === "approved")

  const completenessScore =
    requiredDocs.length > 0 ? Math.round((approvedDocs.length / requiredDocs.length) * 100) : 100

  await supabase.from("applications").update({ completeness_score: completenessScore }).eq("id", applicationId)
}

export async function getDocumentDownloadUrl(documentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  // Get document with application details
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select(`
      *,
      application:applications(applicant_id, institution_id)
    `)
    .eq("id", documentId)
    .single()

  if (docError || !document) {
    throw new Error("Document not found")
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
      throw new Error("Access denied")
    }
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.file_path, 3600)

  if (urlError) {
    throw new Error("Failed to generate download URL: " + urlError.message)
  }

  return signedUrl.signedUrl
}
