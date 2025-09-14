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
  allowedTypes: readonly string[]
}

export const STORAGE_CONFIGS = {
  documents: {
    bucket: 'app_docs',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },
  applicationDocuments: {
    bucket: 'app_docs',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/jpg',
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
      'image/jpg',
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
      error: `File type ${file.type} is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
    }
  }

  return { valid: true }
}

export async function uploadFile(
  file: File,
  config: StorageConfig,
  path?: string,
  userId?: string
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

    // Get current user if not provided
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id
    if (!currentUserId) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    // Generate unique filename with user folder structure
    const fileExtension = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2)
    const fileName = path || `${currentUserId}/${timestamp}-${randomString}.${fileExtension}`

    // Upload file
    const { data, error } = await supabase.storage
      .from(config.bucket)
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(config.bucket)
      .getPublicUrl(data.path)

    return {
      success: true,
      path: data.path,
      url: urlData.publicUrl
    }
  } catch (error) {
    console.error('Upload error:', error)
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
      console.error('Storage delete error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
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
    console.error('Get URL error:', error)
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
      console.error('Storage download error:', error)
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
    console.error('Download error:', error)
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
      console.error('Storage list error:', error)
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
    console.error('List error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'List failed'
    }
  }
}

// Helper function to check if bucket exists and create if needed
export async function ensureBucketExists(bucketName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to get bucket info
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      return { success: false, error: listError.message }
    }

    const bucketExists = buckets.some(bucket => bucket.name === bucketName)
    
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: [...STORAGE_CONFIGS.appDocs.allowedTypes],
        fileSizeLimit: STORAGE_CONFIGS.appDocs.maxFileSize
      })
      
      if (createError) {
        return { success: false, error: createError.message }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Bucket check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check bucket'
    }
  }
}

// Helper function to get file info
export async function getFileInfo(bucket: string, path: string): Promise<{ success: boolean; info?: any; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop()
      })

    if (error) {
      return { success: false, error: error.message }
    }

    const fileInfo = data.find(file => file.name === path.split('/').pop())
    
    return {
      success: true,
      info: fileInfo
    }
  } catch (error) {
    console.error('File info error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file info'
    }
  }
}