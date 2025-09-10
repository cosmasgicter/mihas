import type { ApplicationStatus } from "@/lib/types/database"

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  needs_more_info: "Needs More Info",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  matriculated: "Matriculated",
}

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  needs_more_info: "bg-orange-100 text-orange-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-800",
  matriculated: "bg-purple-100 text-purple-800",
}

export function getStatusLabel(status: ApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status] || status
}

export function getStatusColor(status: ApplicationStatus): string {
  return APPLICATION_STATUS_COLORS[status] || "bg-gray-100 text-gray-800"
}

export function canTransitionTo(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): boolean {
  const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    draft: ["submitted", "withdrawn"],
    submitted: ["under_review", "withdrawn"],
    under_review: ["needs_more_info", "accepted", "rejected"],
    needs_more_info: ["submitted", "withdrawn"],
    accepted: ["matriculated"],
    rejected: [],
    withdrawn: [],
    matriculated: [],
  }

  return transitions[currentStatus]?.includes(newStatus) || false
}

export function getAvailableTransitions(currentStatus: ApplicationStatus): ApplicationStatus[] {
  const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    draft: ["submitted", "withdrawn"],
    submitted: ["under_review", "withdrawn"],
    under_review: ["needs_more_info", "accepted", "rejected"],
    needs_more_info: ["submitted", "withdrawn"],
    accepted: ["matriculated"],
    rejected: [],
    withdrawn: [],
    matriculated: [],
  }

  return transitions[currentStatus] || []
}
