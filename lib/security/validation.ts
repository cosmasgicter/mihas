import { z } from "zod"
import DOMPurify from "isomorphic-dompurify"

// Common validation schemas
export const emailSchema = z.string().email("Invalid email address").max(255)
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase, uppercase, and number")

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes")

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
  .max(20, "Phone number must be less than 20 characters")

export const nrcPassportSchema = z
  .string()
  .min(1, "NRC or Passport number is required")
  .max(50, "NRC or Passport number must be less than 50 characters")
  .regex(/^[A-Z0-9\-/]+$/i, "Invalid NRC or Passport format")

// Sanitization functions
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

export function sanitizeText(input: string): string {
  return input.trim().replace(/\s+/g, " ")
}

export function validateAndSanitizeInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.errors.map((e) => e.message).join(", ")}`)
  }
  return result.data
}

// File validation
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds 10MB limit" }
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: "File type not allowed" }
  }

  // Check file extension matches MIME type
  const extension = file.name.split(".").pop()?.toLowerCase()
  const mimeToExtension: Record<string, string[]> = {
    "application/pdf": ["pdf"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "application/msword": ["doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  }

  const allowedExtensions = mimeToExtension[file.type] || []
  if (extension && !allowedExtensions.includes(extension)) {
    return { valid: false, error: "File extension does not match file type" }
  }

  return { valid: true }
}
