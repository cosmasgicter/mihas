export const DOCUMENT_TYPES = {
  // Identity Documents
  nrc: "National Registration Card (NRC)",
  passport: "Passport",
  birth_certificate: "Birth Certificate",

  // Educational Documents
  grade_12_certificate: "Grade 12 Certificate",
  grade_9_certificate: "Grade 9 Certificate",
  diploma_certificate: "Diploma Certificate",
  degree_certificate: "Degree Certificate",
  transcript: "Academic Transcript",

  // Medical Documents
  medical_certificate: "Medical Certificate",
  vaccination_record: "Vaccination Record",

  // Other Documents
  recommendation_letter: "Letter of Recommendation",
  personal_statement: "Personal Statement",
  cv: "Curriculum Vitae (CV)",
  proof_of_payment: "Proof of Payment",

  // Institution Specific
  mihas_specific: "MIHAS Specific Document",
  katc_specific: "KATC Specific Document",
  mukuba_specific: "Mukuba University Specific Document",
} as const

export type DocumentType = keyof typeof DOCUMENT_TYPES

export const DOCUMENT_CATEGORIES = {
  identity: ["nrc", "passport", "birth_certificate"],
  education: ["grade_12_certificate", "grade_9_certificate", "diploma_certificate", "degree_certificate", "transcript"],
  medical: ["medical_certificate", "vaccination_record"],
  supporting: ["recommendation_letter", "personal_statement", "cv", "proof_of_payment"],
  institutional: ["mihas_specific", "katc_specific", "mukuba_specific"],
} as const

export function getDocumentTypeLabel(type: string): string {
  return DOCUMENT_TYPES[type as DocumentType] || type
}

export function getDocumentCategory(type: string): string {
  for (const [category, types] of Object.entries(DOCUMENT_CATEGORIES)) {
    if (types.includes(type as any)) {
      return category
    }
  }
  return "other"
}

export function getRequiredDocumentsByProgram(programCode: string): string[] {
  // Default required documents for all programs
  const baseRequirements = ["nrc", "grade_12_certificate", "medical_certificate"]

  // Program-specific requirements
  const programRequirements: Record<string, string[]> = {
    // MIHAS Programs
    "MIHAS-NURSING": [...baseRequirements, "transcript", "recommendation_letter"],
    "MIHAS-PHARMACY": [...baseRequirements, "transcript", "personal_statement"],
    "MIHAS-MEDICAL": [...baseRequirements, "transcript", "recommendation_letter", "personal_statement"],

    // Mukuba University Programs (STEM focus)
    "MUKUBA-NUTRITION": [...baseRequirements, "transcript", "recommendation_letter"],
    "MUKUBA-ENGINEERING": [...baseRequirements, "transcript", "personal_statement"],
    "MUKUBA-TECHNOLOGY": [...baseRequirements, "transcript"],

    // KATC Programs (Agricultural focus)
    "KATC-ORGANIC-AGRICULTURE": [...baseRequirements, "grade_9_certificate"],
    "KATC-AGROFORESTRY": [...baseRequirements, "grade_9_certificate"],
    "KATC-BEEKEEPING": [...baseRequirements],
    "KATC-FARM-MANAGEMENT": [...baseRequirements, "grade_9_certificate"],
  }

  return programRequirements[programCode] || baseRequirements
}

export const FILE_SIZE_LIMIT = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export const FILE_TYPE_EXTENSIONS = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > FILE_SIZE_LIMIT) {
    return { valid: false, error: "File size must be less than 10MB" }
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: "File type must be PDF, JPG, PNG, DOC, or DOCX" }
  }

  return { valid: true }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
