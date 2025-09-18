import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const roleState = vi.hoisted(() => ({ isAdmin: true }))

vi.mock('@/hooks/auth/useRoleQuery', () => ({
  useRoleQuery: () => roleState
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  )
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}))

vi.mock('@/lib/documentTemplates', async () => {
  const actual = await vi.importActual<typeof import('@/lib/documentTemplates')>('@/lib/documentTemplates')
  return {
    ...actual,
    renderTemplateById: vi.fn()
  }
})

import { ReportsGenerator } from '@/components/admin/ReportsGenerator'
import { DOCUMENT_TEMPLATE_DEFINITIONS, renderTemplateById } from '@/lib/documentTemplates'

const renderTemplateByIdMock = vi.mocked(renderTemplateById)

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

beforeEach(() => {
  roleState.isAdmin = true
  renderTemplateByIdMock.mockReset()
})

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).clipboard
  }
})

describe('<ReportsGenerator />', () => {
  it('hides document templates for non-admin users', () => {
    roleState.isAdmin = false

    render(<ReportsGenerator />)

    expect(screen.getByText('Generate Reports')).toBeTruthy()
    expect(screen.getByText('Document templates are available to authorised staff members.')).toBeTruthy()
    expect(screen.queryByText('Official Document Templates')).toBeNull()
  })

    it('allows admins to copy generated text templates and preview the output', async () => {
      roleState.isAdmin = true

    renderTemplateByIdMock.mockResolvedValue({
      template: DOCUMENT_TEMPLATE_DEFINITIONS.offerLetter,
      html: '<p>Sample HTML Preview</p>',
      text: 'Sample Text Preview',
      tokens: {
        'student.fullName': 'Jane Doe'
      },
      pdf: {
        bytes: new Uint8Array([1, 2, 3]),
        blob: null,
        fileName: 'offerletter-jane-doe.pdf'
      }
    })

    const clipboardMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardMock },
      configurable: true
    })

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<ReportsGenerator />)

    fireEvent.change(screen.getByLabelText('Student full name'), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByLabelText('Programme'), { target: { value: 'Diploma in Nursing' } })
    fireEvent.change(screen.getByLabelText('Programme start date'), { target: { value: '2025-01-10' } })
    fireEvent.change(screen.getByLabelText('Acceptance deadline'), { target: { value: '2024-12-15' } })
    fireEvent.change(screen.getByLabelText('Staff name'), { target: { value: 'Dr. Alice Banda' } })
    fireEvent.change(screen.getByLabelText('Title / role'), { target: { value: 'Admissions Director' } })

    fireEvent.click(screen.getByRole('button', { name: /Copy Text/i }))

    await waitFor(() => expect(renderTemplateByIdMock).toHaveBeenCalled())

    const [, context] = renderTemplateByIdMock.mock.calls[0]
    expect(context.student?.fullName).toBe('Jane Doe')
    expect(context.application?.programName).toBe('Diploma in Nursing')
    expect(context.staff?.fullName).toBe('Dr. Alice Banda')

      await waitFor(() => expect(clipboardMock).toHaveBeenCalledWith('Sample Text Preview'))
      expect(await screen.findByText(/Sample Text Preview/)).toBeTruthy()

      alertSpy.mockRestore()
    })

    it('surfaces validation errors when template rendering fails', async () => {
      roleState.isAdmin = true

    renderTemplateByIdMock.mockRejectedValue(new Error('Missing required fields: student.fullName'))

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ReportsGenerator />)

    fireEvent.click(screen.getByRole('button', { name: /Copy Text/i }))

      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Missing required fields: student.fullName'))
      expect(screen.queryByText(/preview/i)).toBeNull()

      alertSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
})
