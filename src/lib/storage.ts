import { supabase } from './supabase'

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export interface StorageConfig {
  bucket: string
  maxFileSize: number // in bytes
  allowedTypes: string[]
}

export const STORAGE_CONFIGS = {
  documents: {
    bucket: 'documents',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },
  applicationDocuments: {
    bucket: 'application-documents',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },
  appDocs: {
    bucket: 'app_docs',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  }
} as const

export function validateFile(file: File, config: StorageConfig): { valid: boolean; error?: string } {
  if (file.size > config.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds ${config.maxFileSize / (1024 * 1024)}MB limit`
    }
  }

  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    }
  }

  return { valid: true }
}

export async function uploadFile(
  file: File,
  config: StorageConfig,
  path?: string
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file, config)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Generate unique filename if path not provided
    const fileName = path || `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.name}`

    // Upload file
    const { data, error } = await supabase.storage
      .from(config.bucket)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    // Get public URL for public buckets
    const { data: urlData } = supabase.storage
      .from(config.bucket)
      .getPublicUrl(data.path)

    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

export async function deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

export async function getFileUrl(bucket: string, path: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return {
      success: true,
      url: data.publicUrl
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get URL'
    }
  }
}

export async function downloadFile(bucket: string, path: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    }
  }
}

export async function listFiles(bucket: string, folder?: string): Promise<{ success: boolean; files?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder)

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      files: data
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'List failed'
    }
  }
}