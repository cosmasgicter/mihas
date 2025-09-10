"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ApplicationStatus } from "@/lib/types/database"

export async function createApplication(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  const programId = formData.get("program_id") as string
  const intakeId = formData.get("intake_id") as string

  if (!programId || !intakeId) {
    throw new Error("Program and intake are required")
  }

  // Get program and institution details
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select(`
      *,
      institution:institutions(*)
    `)
    .eq("id", programId)
    .single()

  if (programError || !program) {
    throw new Error("Program not found")
  }

  // Check if user already has an application for this program/intake
  const { data: existingApp } = await supabase
    .from("applications")
    .select("id")
    .eq("applicant_id", user.id)
    .eq("program_id", programId)
    .eq("intake_id", intakeId)
    .single()

  if (existingApp) {
    throw new Error("You already have an application for this program and intake")
  }

  // Create the application
  const { data: application, error: appError } = await supabase
    .from("applications")
    .insert({
      applicant_id: user.id,
      program_id: programId,
      intake_id: intakeId,
      institution_id: program.institution_id,
      status: "draft" as ApplicationStatus,
    })
    .select()
    .single()

  if (appError) {
    throw new Error("Failed to create application: " + appError.message)
  }

  // Create notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    subject: "Application Created",
    body: `Your application for ${program.name} has been created. Complete your profile and upload required documents to submit.`,
    action_url: `/applications/${application.id}`,
  })

  revalidatePath("/dashboard")
  redirect(`/applications/${application.id}`)
}

export async function submitApplication(applicationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  // Get application with program details
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select(`
      *,
      program:programs(*),
      documents(*)
    `)
    .eq("id", applicationId)
    .eq("applicant_id", user.id)
    .single()

  if (appError || !application) {
    throw new Error("Application not found")
  }

  if (application.status !== "draft") {
    throw new Error("Only draft applications can be submitted")
  }

  // Check if user profile is complete
  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

  if (!profile?.first_name || !profile?.last_name || !profile?.phone) {
    throw new Error("Please complete your profile before submitting")
  }

  // Calculate completeness score based on required documents
  const requiredDocs = application.program.required_documents || []
  const uploadedDocs = application.documents || []
  const approvedDocs = uploadedDocs.filter((doc) => doc.verdict === "approved")

  const completenessScore =
    requiredDocs.length > 0 ? Math.round((approvedDocs.length / requiredDocs.length) * 100) : 100

  // Update application status
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      status: "submitted" as ApplicationStatus,
      submitted_at: new Date().toISOString(),
      completeness_score: completenessScore,
    })
    .eq("id", applicationId)

  if (updateError) {
    throw new Error("Failed to submit application: " + updateError.message)
  }

  // Create notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    subject: "Application Submitted",
    body: `Your application ${application.application_number} has been submitted successfully. You will be notified of any updates.`,
    action_url: `/applications/${applicationId}`,
  })

  revalidatePath(`/applications/${applicationId}`)
  revalidatePath("/dashboard")
}

export async function withdrawApplication(applicationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  // Update application status
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      status: "withdrawn" as ApplicationStatus,
    })
    .eq("id", applicationId)
    .eq("applicant_id", user.id)

  if (updateError) {
    throw new Error("Failed to withdraw application: " + updateError.message)
  }

  // Create notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    subject: "Application Withdrawn",
    body: "Your application has been withdrawn successfully.",
    action_url: `/applications/${applicationId}`,
  })

  revalidatePath(`/applications/${applicationId}`)
  revalidatePath("/dashboard")
}

export async function updateApplicationStatus(applicationId: string, status: ApplicationStatus, notes?: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  // Check if user has permission to update applications
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

  // Get application details
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("*, applicant_id, institution_id, application_number")
    .eq("id", applicationId)
    .single()

  if (appError || !application) {
    throw new Error("Application not found")
  }

  // Check institution access for non-super-admin users
  if (userRole.role !== "super_admin" && userRole.institution_id !== application.institution_id) {
    throw new Error("Access denied for this institution")
  }

  // Update application
  const { error: updateError } = await supabase
    .from("applications")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      decision_notes: notes,
    })
    .eq("id", applicationId)

  if (updateError) {
    throw new Error("Failed to update application: " + updateError.message)
  }

  // Create notification for applicant
  const statusMessages = {
    under_review: "Your application is now under review.",
    needs_more_info: "Additional information is required for your application.",
    accepted: "Congratulations! Your application has been accepted.",
    rejected: "Your application has been reviewed and unfortunately was not successful.",
    matriculated: "Welcome! You have been successfully matriculated.",
  }

  if (statusMessages[status as keyof typeof statusMessages]) {
    await supabase.from("notifications").insert({
      user_id: application.applicant_id,
      subject: `Application ${status.replace("_", " ").toUpperCase()}`,
      body: statusMessages[status as keyof typeof statusMessages] + (notes ? ` Notes: ${notes}` : ""),
      action_url: `/applications/${applicationId}`,
    })
  }

  revalidatePath("/admin/applications")
  revalidatePath(`/applications/${applicationId}`)
}
