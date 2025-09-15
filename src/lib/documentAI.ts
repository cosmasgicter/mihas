import { supabase } from './supabase'
import { sessionManager } from './session'
import { freeOCR } from './freeOCR'

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
      // Add timeout wrapper
      const analysisPromise = this.performAnalysis(file, applicationId)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout')), 10000) // 10 second timeout
      )
      
      return await Promise.race([analysisPromise, timeoutPromise])
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

  private async performAnalysis(file: File, applicationId?: string): Promise<DocumentAnalysis> {
    const startTime = Date.now()
    
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
      // Use 100% free OCR processing
      const result = await freeOCR.processDocument(file)
      
      return {
        text: result.text,
        confidence: result.confidence,
        extractedData: result.extractedData
      }
    } catch (error) {
      console.error('OCR processing error:', error)
      return {
        text: 'Document processed',
        confidence: 0.5,
        extractedData: {}
      }
    }
  }

  private parseOCRText(text: string): any {
    const data: any = {}
    const lines = text.split('\n')
    
    // Extract common patterns
    for (const line of lines) {
      // NRC pattern
      const nrcMatch = line.match(/(\d{6}\/\d{2}\/\d)/)
      if (nrcMatch) data.nrc = nrcMatch[1]
      
      // Name patterns
      if (line.toLowerCase().includes('name') && line.includes(':')) {
        data.name = line.split(':')[1]?.trim()
      }
      
      // Exam number
      const examMatch = line.match(/exam.*?(\d{8,})/i)
      if (examMatch) data.examNumber = examMatch[1]
      
      // School
      if (line.toLowerCase().includes('school') && line.includes(':')) {
        data.school = line.split(':')[1]?.trim()
      }
    }
    
    return data
  }

  private assessQuality(file: File, ocrResult: OCRResult): 'excellent' | 'good' | 'poor' {
    const confidence = ocrResult.confidence
    
    if (confidence > 0.85) return 'excellent'
    if (confidence > 0.65) return 'good'
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
    } else if (quality === 'good') {
      suggestions.push('Document quality is good')
    } else {
      suggestions.push('Excellent document quality detected')
    }
    
    if (!data.full_name && !data.name) {
      suggestions.push('Name could not be detected - please verify manually')
    }
    
    if (data.grades && data.grades.length > 0) {
      suggestions.push(`${data.grades.length} subjects detected`)
    }
    
    return suggestions.slice(0, 3) // Limit to 3 suggestions
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