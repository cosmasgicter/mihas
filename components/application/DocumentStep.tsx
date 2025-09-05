'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  FileText, 
  Image, 
  Trash2, 
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

type DocumentType = 'nrc_front' | 'nrc_back' | 'passport_photo' | 'ecz_results' | 'ecz_certificate' | 'additional'

type Document = {
  id?: string
  document_type: DocumentType
  file_name: string
  file_path: string
  file_size: number
  created_at?: string
}

type Application = {
  id: string
  user_id: string
  institution: 'MIHAS' | 'KATC'
  program: 'Nursing' | 'Clinical Medicine' | 'Environmental Health'
  status: string
}

interface DocumentStepProps {
  application: Application
  onComplete: () => void
  onNext: () => void
  onPrevious: () => void
}

const documentTypes = [
  {
    type: 'nrc_front' as DocumentType,
    title: 'NRC Front',
    description: 'Front side of National Registration Card',
    required: true,
    accept: 'image/*,application/pdf',
    icon: Image,
  },
  {
    type: 'nrc_back' as DocumentType,
    title: 'NRC Back',
    description: 'Back side of National Registration Card',
    required: true,
    accept: 'image/*,application/pdf',
    icon: Image,
  },
  {
    type: 'passport_photo' as DocumentType,
    title: 'Passport Photo',
    description: 'Recent passport-size photograph',
    required: true,
    accept: 'image/*',
    icon: Image,
  },
  {
    type: 'ecz_results' as DocumentType,
    title: 'ECZ Results',
    description: 'ECZ Grade 12 examination results',
    required: true,
    accept: 'image/*,application/pdf',
    icon: FileText,
  },
  {
    type: 'ecz_certificate' as DocumentType,
    title: 'ECZ Certificate',
    description: 'ECZ Grade 12 certificate',
    required: true,
    accept: 'image/*,application/pdf',
    icon: FileText,
  },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function DocumentStep({ application, onComplete, onNext, onPrevious }: DocumentStepProps) {
  const [documents, setDocuments] = useState<Record<DocumentType, Document | null>>({} as Record<DocumentType, Document | null>)
  const [uploading, setUploading] = useState<Record<DocumentType, boolean>>({} as Record<DocumentType, boolean>)
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    fetchExistingDocuments()
  }, [])

  const fetchExistingDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', application.id)

      if (error) throw error
      
      if (data) {
        const documentMap: Record<DocumentType, Document | null> = {} as Record<DocumentType, Document | null>
        
        // Initialize all document types as null
        documentTypes.forEach(type => {
          documentMap[type.type] = null
        })
        
        // Populate with existing documents
        data.forEach((doc) => {
          documentMap[doc.document_type as DocumentType] = doc
        })
        
        setDocuments(documentMap)
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load existing documents')
    }
  }

  const validateFile = (file: File, documentType: DocumentType) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    const acceptedTypes = documentTypes.find(dt => dt.type === documentType)?.accept
    if (acceptedTypes) {
      const allowedTypes = acceptedTypes.split(',')
      const isValidType = allowedTypes.some(type => {
        if (type.trim() === 'image/*') {
          return file.type.startsWith('image/')
        }
        if (type.trim() === 'application/pdf') {
          return file.type === 'application/pdf'
        }
        return file.type === type.trim()
      })
      
      if (!isValidType) {
        throw new Error(`File type not allowed. Accepted types: ${acceptedTypes}`)
      }
    }
  }

  const uploadFile = async (file: File, documentType: DocumentType) => {
    try {
      validateFile(file, documentType)
      
      setUploading(prev => ({ ...prev, [documentType]: true }))
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${application.id}/${documentType}_${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('kyc')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // If there's an existing document, delete it first
      const existingDoc = documents[documentType]
      if (existingDoc) {
        // Delete old file from storage
        await supabase.storage
          .from('kyc')
          .remove([existingDoc.file_path])
        
        // Delete old document record
        await supabase
          .from('documents')
          .delete()
          .eq('id', existingDoc.id)
      }

      // Save document record to database
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          application_id: application.id,
          document_type: documentType,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
        })
        .select()
        .single()

      if (docError) throw docError

      // Update local state
      setDocuments(prev => ({
        ...prev,
        [documentType]: docData
      }))

      toast.success(`${documentTypes.find(dt => dt.type === documentType)?.title} uploaded successfully!`)
    } catch (error: any) {
      console.error('Error uploading file:', error)
      toast.error(`Failed to upload file: ${error.message}`)
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }))
    }
  }

  const deleteDocument = async (documentType: DocumentType) => {
    try {
      const doc = documents[documentType]
      if (!doc) return

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('kyc')
        .remove([doc.file_path])

      if (storageError) throw storageError

      // Delete document record
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      // Update local state
      setDocuments(prev => ({
        ...prev,
        [documentType]: null
      }))

      toast.success('Document deleted successfully')
    } catch (error: any) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    }
  }

  const previewDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('kyc')
        .createSignedUrl(document.file_path, 3600) // 1 hour expiry

      if (error) throw error
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error: any) {
      console.error('Error previewing document:', error)
      toast.error('Failed to preview document')
    }
  }

  const handleFileSelect = (file: File, documentType: DocumentType) => {
    uploadFile(file, documentType)
  }

  const onSubmit = async () => {
    // Check if all required documents are uploaded
    const missingDocs = documentTypes.filter(dt => dt.required && !documents[dt.type])
    
    if (missingDocs.length > 0) {
      toast.error(`Please upload all required documents: ${missingDocs.map(dt => dt.title).join(', ')}`)
      return
    }

    setLoading(true)

    try {
      // Update application timestamp
      await supabase
        .from('applications')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', application.id)

      toast.success('Documents saved successfully!')
      onComplete()
      onNext()
    } catch (error: any) {
      console.error('Error saving documents:', error)
      toast.error('Failed to save documents')
    } finally {
      setLoading(false)
    }
  }

  const requiredDocsCount = documentTypes.filter(dt => dt.required).length
  const uploadedRequiredDocs = documentTypes.filter(dt => dt.required && documents[dt.type]).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Required Documents</CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Upload all required documents. Files must be in PDF or image format, maximum 10MB each.
          </p>
          <Badge variant={uploadedRequiredDocs === requiredDocsCount ? 'default' : 'secondary'}>
            {uploadedRequiredDocs}/{requiredDocsCount} Required
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Upload Grid */}
        <div className="grid gap-6">
          {documentTypes.map((docType) => {
            const IconComponent = docType.icon
            const document = documents[docType.type]
            const isUploading = uploading[docType.type]
            
            return (
              <div key={docType.type} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {docType.title}
                        {docType.required && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      <p className="text-sm text-gray-600">{docType.description}</p>
                    </div>
                  </div>
                  
                  {document ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Uploaded
                      </Badge>
                    </div>
                  ) : docType.required ? (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        Required
                      </Badge>
                    </div>
                  ) : null}
                </div>

                {document ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">{document.file_name}</p>
                        <p className="text-xs text-green-700">
                          {(document.file_size / 1024 / 1024).toFixed(2)} MB • 
                          Uploaded {document.created_at ? new Date(document.created_at).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => previewDocument(document)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => deleteDocument(docType.type)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                    {isUploading ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          {docType.accept.replace(/\*/g, '').replace(/,/g, ', ')} (max 10MB)
                        </p>
                        <input
                          type="file"
                          accept={docType.accept}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFileSelect(file, docType.type)
                            }
                          }}
                          className="hidden"
                          id={`file-${docType.type}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const fileInput = document.getElementById(`file-${docType.type}`)
                            if (fileInput) {
                              ;(fileInput as HTMLInputElement).click()
                            }
                          }}
                        >
                          Select File
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Upload Guidelines */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Upload Guidelines:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Documents must be clear and readable</li>
              <li>Maximum file size: 10MB per document</li>
              <li>Accepted formats: PDF, JPG, PNG</li>
              <li>Ensure all text and details are visible</li>
              <li>Documents should not be expired (where applicable)</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button type="button" variant="outline" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <Button 
            onClick={onSubmit} 
            disabled={loading || uploadedRequiredDocs < requiredDocsCount}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Save & Continue</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}