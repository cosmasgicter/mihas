"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { FileText, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import type { Notification } from "@/lib/types/database"

interface ActivityFeedProps {
  notifications: Notification[]
  loading?: boolean
}

export function ActivityFeed({ notifications, loading }: ActivityFeedProps) {
  const getIcon = (subject: string) => {
    if (subject.includes("Application")) return FileText
    if (subject.includes("Document")) return FileText
    if (subject.includes("ACCEPTED")) return CheckCircle
    if (subject.includes("REJECTED")) return XCircle
    if (subject.includes("REVIEW")) return Clock
    return AlertCircle
  }

  const getIconColor = (subject: string) => {
    if (subject.includes("ACCEPTED")) return "text-green-600"
    if (subject.includes("REJECTED")) return "text-red-600"
    if (subject.includes("REVIEW")) return "text-yellow-600"
    return "text-blue-600"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {notifications.slice(0, 10).map((notification) => {
              const Icon = getIcon(notification.subject)
              const iconColor = getIconColor(notification.subject)

              return (
                <div key={notification.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{notification.subject}</p>
                      {!notification.read_at && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
