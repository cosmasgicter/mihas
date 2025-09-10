"use server"

import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

interface AuditLogData {
  action: string
  entityType: string
  entityId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const supabase = await createClient()
    const headersList = await headers()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    await supabase.from("audit_logs").insert({
      actor_id: user?.id || null,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      old_values: data.oldValues || null,
      new_values: data.newValues || null,
      metadata: {
        ...data.metadata,
        timestamp: new Date().toISOString(),
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  } catch (error) {
    console.error("Failed to create audit log:", error)
    // Don't throw - audit logging should not break the main flow
  }
}

export async function getAuditLogs(filters: {
  entityType?: string
  entityId?: string
  actorId?: string
  action?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Authentication required")
  }

  // Check if user has permission to view audit logs
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["registrar", "super_admin"])
    .is("revoked_at", null)
    .single()

  if (!userRole) {
    throw new Error("Insufficient permissions to view audit logs")
  }

  let query = supabase
    .from("audit_logs")
    .select(`
      *,
      actor:user_profiles(first_name, last_name)
    `)
    .order("created_at", { ascending: false })

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType)
  }

  if (filters.entityId) {
    query = query.eq("entity_id", filters.entityId)
  }

  if (filters.actorId) {
    query = query.eq("actor_id", filters.actorId)
  }

  if (filters.action) {
    query = query.eq("action", filters.action)
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate)
  }

  const limit = Math.min(filters.limit || 50, 100)
  const offset = filters.offset || 0

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    throw new Error("Failed to fetch audit logs: " + error.message)
  }

  return data
}
