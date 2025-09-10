"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { Application } from "@/lib/types/database"

export function useRealtimeApplications(userId?: string, userRole?: string) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    // Fetch initial applications
    const fetchApplications = async () => {
      let query = supabase.from("applications").select(`
          *,
          program:programs(*),
          intake:program_intakes(*),
          institution:institutions(*)
        `)

      // Filter based on user role
      if (userRole === "applicant") {
        query = query.eq("applicant_id", userId)
      }
      // For staff roles, additional filtering would be done based on institution

      const { data, error } = await query.order("created_at", { ascending: false })

      if (!error && data) {
        setApplications(data)
      }
      setLoading(false)
    }

    fetchApplications()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("applications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: userRole === "applicant" ? `applicant_id=eq.${userId}` : undefined,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newApplication = payload.new as Application
            setApplications((prev) => [newApplication, ...prev])
          } else if (payload.eventType === "UPDATE") {
            const updatedApplication = payload.new as Application
            setApplications((prev) =>
              prev.map((app) => (app.id === updatedApplication.id ? { ...app, ...updatedApplication } : app)),
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id
            setApplications((prev) => prev.filter((app) => app.id !== deletedId))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, userRole])

  return { applications, loading }
}
