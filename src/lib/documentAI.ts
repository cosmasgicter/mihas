import { supabase } from './supabase'
import { sessionManager } from './session'

export interface OCRResult {
  text: string
  confidence: number
  extractedData: {
    name?: string
    nrc?: string
    grades?: { subject: string; grade: number }[]
    examNumber?: string
    school?: string
  }
}

export interface DocumentAnalysis {
  quality: 'excellent' | 'good' | 'poor'
  completeness: number
  suggestions: string[]
  autoFillData: Record<string, any>
  processingTime: number
}

export class DocumentAI {
  private static instance: DocumentAI
  
  static getInstance(): DocumentAI {
    if (!DocumentAI.instance) {
      DocumentAI.instance = new DocumentAI()
    }
    return DocumentAI.instance
  }

  async analyzeDocument(file: File, applicationId?: string): Promise<DocumentAnalysis> {
    const startTime = Date.now()
    
    try {
      // Validate session
      const isValid = await sessionManager.isSessionValid()
      if (!isValid) {
        throw new Error('Session expired. Please sign in again.')
      }

      // Validate file
      this.validateFile(file)
      
      const ocrResult = await this.performOCR(file)
      const quality = this.assessQuality(file, ocrResult)
      const extractedData = this.extractStructuredData(ocrResult)
      const processingTime = Date.now() - startTime
      
      const analysis: DocumentAnalysis = {
        quality,
        completeness: this.calculateCompleteness(extractedData),
        suggestions: this.generateSuggestions(quality, extractedData),
        autoFillData: extractedData,
        processingTime
      }

      // Store analysis results if applicationId provided
      if (applicationId) {
        await this.storeAnalysisResults(applicationId, file.name, analysis)
      }
      
      return analysis
    } catch (error) {
      console.error('Document analysis failed:', error)
      return {
        quality: 'poor',
        completeness: 0,
        suggestions: [error instanceof Error ? error.message : 'Document could not be analyzed. Please ensure it is clear and readable.'],
        autoFillData: {},
        processingTime: Date.now() - startTime
      }
    }
  }

  private validateFile(file: File): void {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit')
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload JPEG, PNG, or PDF files only')
    }
  }

  private async performOCR(file: File): Promise<OCRResult> {
    try {
      // Enhanced OCR simulation with realistic patterns
      const fileName = file.name.toLowerCase()
      const isResultSlip = fileName.includes('result') || fileName.includes('grade')
      const isPayment = fileName.includes('payment') || fileName.includes('receipt')
      
      // Simulate processing time based on file size
      const processingTime = Math.min(file.size / 100000, 3000)
      await new Promise(resolve => setTimeout(resolve, processingTime))
      
      let mockResult: OCRResult
      
      if (isResultSlip) {
        mockResult = {
          text: 'ZAMBIA EXAMINATIONS COUNCIL\nGRADE 12 CERTIFICATE\nCandidate Name: STUDENT NAME\nNRC: 123456/12/1\nExam Number: 2023001234\nSchool: SAMPLE HIGH SCHOOL\n\nSUBJECT RESULTS:\nMathematics: 2\nEnglish: 3\nBiology: 2\nChemistry: 4\nPhysics: 3\nGeography: 2',
          confidence: 0.92,
          extractedData: {
            name: 'STUDENT NAME',
            nrc: '123456/12/1',
            examNumber: '2023001234',
            school: 'SAMPLE HIGH SCHOOL',
            grades: [
              { subject: 'Mathematics', grade: 2 },
              { subject: 'English', grade: 3 },
              { subject: 'Biology', grade: 2 },
              { subject: 'Chemistry', grade: 4 },
              { subject: 'Physics', grade: 3 },
              { subject: 'Geography', grade: 2 }
            ]
          }
        }
      } else if (isPayment) {
        mockResult = {
          text: 'MTN MOBILE MONEY\nTransaction Receipt\nAmount: K150.00\nReference: MP123456789\nDate: 2024-01-15\nTo: KATC/MIHAS',
          confidence: 0.88,
          extractedData: {
            name: 'Payment Receipt',
            examNumber: 'MP123456789'
          }
        }
      } else {
        mockResult = {
          text: 'Document text extracted',
          confidence: 0.75,
          extractedData: {}
        }
      }
      
      return mockResult
    } catch (error) {
      throw new Error('OCR processing failed')
    }
  }

  private assessQuality(file: File, ocrResult: OCRResult): 'excellent' | 'good' | 'poor' {
    const size = file.size
    const confidence = ocrResult.confidence
    
    if (confidence > 0.9 && size > 100000) return 'excellent'
    if (confidence > 0.7 && size > 50000) return 'good'
    return 'poor'
  }

  private extractStructuredData(ocrResult: OCRResult): Record<string, any> {
    const data: Record<string, any> = {
      confidence: ocrResult.confidence
    }
    
    if (ocrResult.extractedData.name) {
      data.full_name = ocrResult.extractedData.name
    }
    
    if (ocrResult.extractedData.nrc) {
      data.nrc_number = ocrResult.extractedData.nrc
    }
    
    if (ocrResult.extractedData.examNumber) {
      data.exam_number = ocrResult.extractedData.examNumber
    }
    
    if (ocrResult.extractedData.school) {
      data.school_name = ocrResult.extractedData.school
    }
    
    if (ocrResult.extractedData.grades && ocrResult.extractedData.grades.length > 0) {
      data.grades = ocrResult.extractedData.grades
    }
    
    return data
  }

  private calculateCompleteness(data: Record<string, any>): number {
    const fields = Object.values(data).filter(v => v !== undefined && v !== null)
    return Math.min(fields.length * 25, 100)
  }

  private generateSuggestions(quality: string, data: Record<string, any>): string[] {
    const suggestions: string[] = []
    
    if (quality === 'poor') {
      suggestions.push('Consider retaking the photo with better lighting')
      suggestions.push('Ensure the document is flat and all text is visible')
      suggestions.push('Try scanning in PDF format for better quality')
    } else if (quality === 'good') {
      suggestions.push('Document quality is acceptable but could be improved')
    } else {
      suggestions.push('Excellent document quality detected')
    }
    
    if (!data.full_name && !data.name) {
      suggestions.push('Name could not be detected - please verify manually')
    }
    
    if (data.grades && data.grades.length > 0) {
      suggestions.push(`${data.grades.length} subjects detected automatically`)
      if (data.grades.length < 5) {
        suggestions.push('Consider adding more subjects to meet minimum requirements')
      }
    }
    
    return suggestions
  }

  private async storeAnalysisResults(
    applicationId: string, 
    documentType: string, 
    analysis: DocumentAnalysis
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_analysis')
        .insert({
          application_id: applicationId,
          document_type: documentType,
          quality: analysis.quality,
          completeness: analysis.completeness,
          ocr_confidence: analysis.autoFillData.confidence || 0,
          extracted_data: analysis.autoFillData,
          suggestions: analysis.suggestions
        })
      
      if (error) {
        console.error('Failed to store analysis results:', error)
      }
    } catch (error) {
      console.error('Error storing analysis results:', error)
    }
  }
}

export const documentAI = DocumentAI.getInstance()