import { describe, expect, it } from 'vitest'
import { exportUsersToPDF, type UserPDFFieldDefinition } from '@/lib/exportUtils'
import type { UserProfile } from '@/lib/supabase'

const buildSampleUsers = (count: number): UserProfile[] => {
  return Array.from({ length: count }, (_, index) => {
    const created = new Date(2023, index % 12, (index % 27) + 1)
    const updated = new Date(2024, index % 12, (index % 27) + 2)
    const birth = new Date(1990 + (index % 10), index % 12, (index % 27) + 1)

    return {
      id: `profile-${index}`,
      user_id: `user-${index}`,
      full_name: `Sample User ${index}`,
      email: `user${index}@example.com`,
      phone: `+260000${index.toString().padStart(4, '0')}`,
      role: index % 3 === 0 ? 'student' : index % 3 === 1 ? 'admin' : 'registrar',
      date_of_birth: birth.toISOString(),
      sex: index % 2 === 0 ? 'Male' : 'Female',
      nationality: index % 2 === 0 ? 'Zambia' : 'Ghana',
      address: `Street ${index} District ${index % 10}`,
      city: `City ${index % 5}`,
      next_of_kin_name: `Kin ${index}`,
      next_of_kin_phone: `+260900${index.toString().padStart(4, '0')}`,
      avatar_url: undefined,
      bio: undefined,
      created_at: created.toISOString(),
      updated_at: updated.toISOString()
    }
  })
}

describe('exportUsersToPDF', () => {
  it('generates a printable PDF with expected columns and pagination', async () => {
    const fieldDefinitions: Array<UserPDFFieldDefinition<UserProfile>> = [
      { id: 'user_id', label: 'User ID' },
      { id: 'full_name', label: 'Full Name' },
      { id: 'email', label: 'Email' },
      { id: 'role', label: 'Role' },
      { id: 'created_at', label: 'Registered' },
      { id: 'updated_at', label: 'Last Updated' }
    ]

    const selectedFields = fieldDefinitions.map(field => field.id)
    const users = buildSampleUsers(90)

    const result = await exportUsersToPDF(users, selectedFields, fieldDefinitions, {
      download: false,
      metadata: ['Automated Validation Export']
    })

    expect(result.rowCount).toBe(users.length)
    expect(result.columnLabels).toEqual(fieldDefinitions.map(field => field.label))
    expect(result.bytes.length).toBeGreaterThan(2000)

    const { PDFDocument } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.load(result.bytes)

    expect(pdfDoc.getPageCount()).toBe(result.pageCount)
    expect(result.pageCount).toBeGreaterThan(1)
  })
})
