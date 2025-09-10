import { z } from "zod"

export const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  middle_name: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  nrc_passport: z.string().min(1, "NRC or Passport number is required"),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().default("Zambian"),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  preferred_language: z.string().default("en"),
})

export const applicationSchema = z.object({
  program_id: z.string().uuid("Invalid program ID"),
  intake_id: z.string().uuid("Invalid intake ID"),
})

export const documentUploadSchema = z.object({
  document_type: z.string().min(1, "Document type is required"),
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024, // 10MB
      "File size must be less than 10MB",
    )
    .refine(
      (file) =>
        [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ].includes(file.type),
      "File type must be PDF, JPG, PNG, DOC, or DOCX",
    ),
})
