"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { Notification } from "@/lib/types/database"

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (!error && data) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.read_at).length)
      }
      setLoading(false)
    }

    fetchNotifications()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newNotification = payload.new as Notification
            setNotifications((prev) => [newNotification, ...prev])
            if (!newNotification.read_at) {
              setUnreadCount((prev) => prev + 1)
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedNotification = payload.new as Notification
            setNotifications((prev) => prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n)))
            // Recalculate unread count
            setNotifications((current) => {
              setUnreadCount(current.filter((n) => !n.read_at).length)
              return current
            })
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId)

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
      setUnreadCount(0)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("notifications").delete().eq("id", notificationId).eq("user_id", userId)

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
