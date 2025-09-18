import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_TEMPLATE_DEFINITIONS,
  renderOfferLetter,
  renderPaymentBalanceStatement,
  renderTemplateById
} from '@/lib/documentTemplates'

describe('documentTemplates', () => {
  it('renders offer letter with substituted tokens and generates a PDF', async () => {
    const result = await renderOfferLetter({
      student: {
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com'
      },
      application: {
        programName: 'Diploma in Nursing',
        intake: 'January 2025',
        startDate: '2025-01-10',
        responseDeadline: '2024-12-15',
        orientationDate: '2025-01-05',
        referenceNumber: 'APP-001'
      },
      staff: {
        fullName: 'Dr. Alice Banda',
        title: 'Admissions Director',
        email: 'admissions@example.com',
        phone: '+260 700 000 000'
      }
    })

    expect(result.text).not.toContain('{{')
    expect(result.html).toContain('<article')
    expect(result.tokens['student.fullName']).toBe('Jane Doe')
    expect(result.tokens['application.programName']).toBe('Diploma in Nursing')
    expect(result.pdf.bytes.length).toBeGreaterThan(0)
    expect(result.pdf.fileName).toBe('offerletter-jane-doe.pdf')

    const { PDFDocument } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.load(result.pdf.bytes)
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0)
  })

  it('throws a helpful error when required placeholders are missing', async () => {
    await expect(renderOfferLetter({})).rejects.toThrow(/Missing required fields/)
  })

  it('handles payment breakdown lists and optional placeholders gracefully', async () => {
    const result = await renderPaymentBalanceStatement({
      student: {
        fullName: 'Chipo Zulu'
      },
      application: {
        programName: 'Community Health',
        startDate: '2025-03-01',
        responseDeadline: '2025-02-01'
      },
      payment: {
        amountDue: 1250,
        amountPaid: 800,
        balance: 450,
        dueDate: '2025-02-15',
        lastPaymentDate: '2024-12-30',
        breakdown: [
          { label: 'Registration Fee', amount: 500 },
          { label: 'Laboratory Deposit', amount: 750 }
        ]
      },
      staff: {
        fullName: 'Mwansa Tembo',
        title: 'Finance Officer'
      }
    })

    expect(result.text).toMatch(/Registration Fee/)
    expect(result.text).toMatch(/Laboratory Deposit/)
    expect(result.text).toMatch(/Outstanding Balance/)
    expect(result.tokens['staff.email']).toBe('')
    expect(result.tokens['staff.phone']).toBe('')
    expect(result.pdf.bytes.length).toBeGreaterThan(0)

    const { PDFDocument } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.load(result.pdf.bytes)
    expect(pdfDoc.getPageCount()).toBeGreaterThan(0)
  })

  it('supports rendering templates by id', async () => {
    const result = await renderTemplateById('interviewInvitation', {
      student: { fullName: 'John Phiri' },
      application: {
        programName: 'Radiography',
        interviewDate: '2025-01-20',
        interviewTime: '09:00',
        interviewMode: 'In-person',
        interviewLocation: 'Admissions Centre'
      },
      staff: {
        fullName: 'Nasilele Mweemba',
        title: 'Admissions Coordinator',
        email: 'coordinator@example.com'
      }
    }, { fileName: 'custom.pdf', titleOverride: 'Interview Invite' })

    expect(result.template).toBe(DOCUMENT_TEMPLATE_DEFINITIONS.interviewInvitation)
    expect(result.pdf.fileName).toBe('custom.pdf')
    expect(result.text).toContain('Interview Schedule')
    expect(result.html).toContain('Interview Schedule')
  })
})
