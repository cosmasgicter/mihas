"use server"

import { createClient } from "@/lib/supabase/server"
import type { NotificationChannel } from "@/lib/types/database"

export async function createNotification({
  userId,
  subject,
  body,
  actionUrl,
  channel = "in_app",
  metadata = {},
}: {
  userId: string
  subject: string
  body: string
  actionUrl?: string
  channel?: NotificationChannel
  metadata?: Record<string, any>
}) {
  const supabase = await createClient()

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    channel,
    subject,
    body,
    action_url: actionUrl,
    metadata,
  })

  if (error) {
    throw new Error("Failed to create notification: " + error.message)
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)

  if (error) {
    throw new Error("Failed to mark notification as read: " + error.message)
  }
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error("Authentication required")
  }

  const { error } = await supabase.from("notifications").delete().eq("id", notificationId).eq("user_id", user.id)

  if (error) {
    throw new Error("Failed to delete notification: " + error.message)
  }
}
