import type { DocumentVerdict } from "@/lib/types/database"

export const DOCUMENT_VERDICT_LABELS: Record<DocumentVerdict, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
}

export const DOCUMENT_VERDICT_COLORS: Record<DocumentVerdict, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

export function getVerdictLabel(verdict: DocumentVerdict): string {
  return DOCUMENT_VERDICT_LABELS[verdict] || verdict
}

export function getVerdictColor(verdict: DocumentVerdict): string {
  return DOCUMENT_VERDICT_COLORS[verdict] || "bg-gray-100 text-gray-800"
}

export const COMMON_REJECTION_REASONS = [
  "Document is not clear/readable",
  "Document appears to be altered or fraudulent",
  "Wrong document type uploaded",
  "Document is expired",
  "Document does not match applicant information",
  "Document is incomplete",
  "Document quality is too poor",
  "Document is not in acceptable format",
  "Document is missing required information",
  "Document needs to be certified/notarized",
]

export function calculateDocumentCompleteness(
  requiredDocuments: string[],
  uploadedDocuments: Array<{ document_type: string; verdict: DocumentVerdict }>,
): {
  totalRequired: number
  uploaded: number
  approved: number
  pending: number
  rejected: number
  completenessPercentage: number
  approvalPercentage: number
} {
  const totalRequired = requiredDocuments.length
  const uploaded = uploadedDocuments.length
  const approved = uploadedDocuments.filter((doc) => doc.verdict === "approved").length
  const pending = uploadedDocuments.filter((doc) => doc.verdict === "pending").length
  const rejected = uploadedDocuments.filter((doc) => doc.verdict === "rejected").length

  const completenessPercentage = totalRequired > 0 ? Math.round((uploaded / totalRequired) * 100) : 100
  const approvalPercentage = totalRequired > 0 ? Math.round((approved / totalRequired) * 100) : 100

  return {
    totalRequired,
    uploaded,
    approved,
    pending,
    rejected,
    completenessPercentage,
    approvalPercentage,
  }
}
