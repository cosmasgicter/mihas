"use server"

import { createClient } from "@/lib/supabase/server"
import { createAuditLog } from "@/lib/security/audit"

export async function reportSecurityIncident({
  type,
  description,
  severity = "medium",
  metadata = {},
}: {
  type: string
  description: string
  severity?: "low" | "medium" | "high" | "critical"
  metadata?: Record<string, any>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Log the security incident
  await createAuditLog({
    action: "security_incident",
    entityType: "security",
    entityId: `incident_${Date.now()}`,
    metadata: {
      type,
      description,
      severity,
      reportedBy: user?.id,
      ...metadata,
    },
  })

  // In a production environment, you might also:
  // - Send alerts to security team
  // - Create tickets in incident management system
  // - Trigger automated responses based on severity

  console.warn(`Security incident reported: ${type} - ${description}`, {
    severity,
    user: user?.id,
    metadata,
  })
}

export async function getUserDataExport(userId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    throw new Error("Unauthorized")
  }

  // Collect all user data
  const [profile, applications, documents, notifications] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", userId).single(),
    supabase.from("applications").select("*").eq("applicant_id", userId),
    supabase
      .from("documents")
      .select("*")
      .in("application_id", applications.data?.map((app) => app.id) || []),
    supabase.from("notifications").select("*").eq("user_id", userId),
  ])

  const exportData = {
    profile: profile.data,
    applications: applications.data,
    documents: documents.data?.map((doc) => ({
      ...doc,
      file_path: "[REDACTED]", // Don't include actual file paths
    })),
    notifications: notifications.data,
    exportedAt: new Date().toISOString(),
  }

  // Log the data export
  await createAuditLog({
    action: "data_export",
    entityType: "user",
    entityId: userId,
    metadata: {
      exportSize: JSON.stringify(exportData).length,
    },
  })

  return exportData
}

export async function deleteUserData(userId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    throw new Error("Unauthorized")
  }

  // This would typically require additional verification
  // and might be handled by an admin rather than self-service

  // Log the deletion request
  await createAuditLog({
    action: "data_deletion_request",
    entityType: "user",
    entityId: userId,
    metadata: {
      requestedAt: new Date().toISOString(),
    },
  })

  // In a real implementation, this might:
  // - Create a deletion request ticket
  // - Require admin approval
  // - Have a waiting period
  // - Anonymize rather than delete to preserve audit trails

  throw new Error("Data deletion requests must be processed by an administrator")
}
