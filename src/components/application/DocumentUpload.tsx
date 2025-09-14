import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Upload, X, FileText, CheckCircle, AlertCircle, Brain, Sparkles } from 'lucide-react'
import { UploadedFile } from '@/forms/applicationSchema'
import { documentAI } from '@/lib/documentAI'
import { motion, AnimatePresence } from 'framer-motion'

interface DocumentUploadProps {
  uploadedFiles: UploadedFile[]
  uploadingFiles: string[]
  uploadProgress: {[key: string]: number}
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (fileId: string) => void
  formatFileSize: (bytes: number) => string
  error?: string
  onDocumentAnalyzed?: (analysis: any) => void
}

export function DocumentUpload({ 
  uploadedFiles, 
  uploadingFiles, 
  uploadProgress, 
  onFileUpload, 
  onRemoveFile, 
  formatFileSize,
  error,
  onDocumentAnalyzed
}: DocumentUploadProps) {
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analysisResults, setAnalysisResults] = useState<{[key: string]: any}>({})

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Trigger original upload handler
    onFileUpload(event)
    
    // Analyze documents with AI
    for (const file of files) {
      if (file.type.includes('image') || file.type === 'application/pdf') {
        setAnalyzing(file.name)
        try {
          const analysis = await documentAI.analyzeDocument(file)
          setAnalysisResults(prev => ({ ...prev, [file.name]: analysis }))
          onDocumentAnalyzed?.(analysis)
        } catch (error) {
          console.error('Document analysis failed:', error)
        } finally {
          setAnalyzing(null)
        }
      }
    }
  }
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
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploadingFiles.length > 0}
            key={uploadedFiles.length + analyzing} // Force re-render to clear input
          />
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
            uploadingFiles.length > 0 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }`}>
            <Upload className={`h-8 w-8 mx-auto mb-2 ${
              uploadingFiles.length > 0 ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <p className={`text-sm ${
              uploadingFiles.length > 0 ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {uploadingFiles.length > 0 ? 'Uploading...' : 'Click to upload files or drag and drop'}
            </p>
            <p className={`text-xs ${
              uploadingFiles.length > 0 ? 'text-gray-400' : 'text-gray-500'
            }`}>
              PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB each
            </p>
          </div>
        </label>
        
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
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
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 progress-pulse'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {isComplete && (
                  <div className="mt-2 text-xs text-green-600 upload-success slide-in-up">
                    File uploaded successfully!
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* AI Analysis Status */}
      <AnimatePresence>
        {analyzing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center">
              <Brain className="h-5 w-5 text-blue-600 mr-2 animate-pulse" />
              <span className="text-sm text-blue-800">
                🤖 AI is analyzing "{analyzing}"...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          {uploadedFiles.map((file) => {
            const analysis = analysisResults[file.name]
            return (
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
                
                {/* AI Analysis Results */}
                {analysis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="px-3 pb-3"
                  >
                    <div className="bg-white rounded-lg p-3 border border-green-300">
                      <div className="flex items-center mb-2">
                        <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-xs font-medium text-purple-800">
                          AI Analysis Results
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quality:</span>
                          <span className={`font-medium ${
                            analysis.quality === 'excellent' ? 'text-green-600' :
                            analysis.quality === 'good' ? 'text-blue-600' : 'text-yellow-600'
                          }`}>
                            {analysis.quality}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completeness:</span>
                          <span className="font-medium text-blue-600">
                            {analysis.completeness}%
                          </span>
                        </div>
                        {analysis.suggestions.length > 0 && (
                          <div className="mt-2">
                            <span className="text-gray-600 block mb-1">Suggestions:</span>
                            <ul className="list-disc list-inside text-gray-700 space-y-1">
                              {analysis.suggestions.slice(0, 2).map((suggestion: string, idx: number) => (
                                <li key={idx}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}