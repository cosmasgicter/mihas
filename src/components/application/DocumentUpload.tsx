import React from 'react'
import { Button } from '@/components/ui/Button'
import { Upload, X, FileText } from 'lucide-react'
import { UploadedFile } from '@/forms/applicationSchema'

interface DocumentUploadProps {
  uploadedFiles: UploadedFile[]
  uploadingFiles: string[]
  uploadProgress: {[key: string]: number}
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (fileId: string) => void
  formatFileSize: (bytes: number) => string
}

export function DocumentUpload({ 
  uploadedFiles, 
  uploadingFiles, 
  uploadProgress, 
  onFileUpload, 
  onRemoveFile, 
  formatFileSize 
}: DocumentUploadProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-secondary mb-4">
        Supporting Documents
      </h2>
      
      <div className="mb-4">
        <label className="block">
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={onFileUpload}
            className="hidden"
          />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/40 cursor-pointer transition-colors">
            <Upload className="h-8 w-8 text-secondary mx-auto mb-2" />
            <p className="text-sm text-secondary">
              Click to upload files or drag and drop
            </p>
            <p className="text-xs text-secondary">
              PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB each
            </p>
          </div>
        </label>
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => {
            const fileName = uploadedFiles.find(f => f.id === fileId)?.name || fileId.split('-')[0]
            return (
              <div key={fileId} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-secondary">{fileName}</span>
                  <span className="text-sm text-primary">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-secondary">{file.name}</p>
                  <p className="text-xs text-secondary">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(file.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}