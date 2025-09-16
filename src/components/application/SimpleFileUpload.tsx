import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { uploadApplicationFile, validateApplicationFile } from '@/lib/storage'
import { useAuth } from '@/contexts/AuthContext'

interface UploadedFile {
  id: string
  name: string
  size: number
  url?: string
}

interface SimpleFileUploadProps {
  uploadedFiles: UploadedFile[]
  uploadingFiles: string[]
  uploadProgress: {[key: string]: number}
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (fileId: string) => void
  formatFileSize: (bytes: number) => string
  error?: string
  applicationId?: string
  fileType?: string
  onUploadComplete?: (file: UploadedFile) => void
}

export function SimpleFileUpload({ 
  uploadedFiles, 
  uploadingFiles, 
  uploadProgress, 
  onFileUpload, 
  onRemoveFile, 
  formatFileSize,
  error,
  applicationId,
  fileType = 'document',
  onUploadComplete
}: SimpleFileUploadProps) {
  const { user } = useAuth()
  const [localError, setLocalError] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !applicationId) return

    // Validate file
    const validation = validateApplicationFile(file)
    if (!validation.valid) {
      setLocalError(validation.error || 'Invalid file')
      event.target.value = ''
      return
    }

    setLocalError('')
    setIsUploading(true)

    try {
      const result = await uploadApplicationFile(file, user.id, applicationId, fileType)
      
      if (result.success && result.url) {
        const uploadedFile: UploadedFile = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          url: result.url
        }
        
        if (onUploadComplete) {
          onUploadComplete(uploadedFile)
        }
      } else {
        setLocalError(result.error || 'Upload failed')
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const displayError = error || localError
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Supporting Documents
        </h2>
        {uploadedFiles.length > 0 && (
          <div className="flex items-center text-sm text-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <label className="block">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading || uploadingFiles.length > 0}
          />
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
            isUploading || uploadingFiles.length > 0 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }`}>
            <Upload className={`h-8 w-8 mx-auto mb-2 ${
              isUploading || uploadingFiles.length > 0 ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <p className={`text-sm ${
              isUploading || uploadingFiles.length > 0 ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {isUploading || uploadingFiles.length > 0 ? 'Uploading...' : 'Click to upload file'}
            </p>
            <p className={`text-xs ${
              isUploading || uploadingFiles.length > 0 ? 'text-gray-400' : 'text-gray-500'
            }`}>
              PDF, JPG, JPEG, PNG up to 10MB
            </p>
          </div>
        </label>
        
        {displayError && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          </div>
        )}
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-3">
          {Object.entries(uploadProgress).map(([fileId, progress]) => {
            const fileName = uploadedFiles.find(f => f.id === fileId)?.name || fileId.split('-')[0]
            const isComplete = progress === 100
            return (
              <div key={fileId} className={`rounded-lg p-4 border transition-all duration-300 ${
                isComplete ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    ) : (
                      <div className="h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className={`text-sm font-medium ${
                      isComplete ? 'text-green-800' : 'text-blue-800'
                    }`}>{fileName}</span>
                  </div>
                  <span className={`text-sm font-semibold ${
                    isComplete ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {isComplete ? 'Complete!' : `${progress}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      isComplete 
                        ? 'bg-gradient-to-r from-green-500 to-green-600' 
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {isComplete && (
                  <div className="mt-2 text-xs text-green-600">
                    File uploaded successfully!
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          {uploadedFiles.map((file) => (
            <motion.div 
              key={file.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg transition-all duration-200 hover:shadow-sm"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <FileText className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">{file.name}</p>
                    <p className="text-xs text-green-600">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(file.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}