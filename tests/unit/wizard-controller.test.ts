import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useWizardController from '@/pages/student/applicationWizard/hooks/useWizardController'

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false
  })
}))

vi.mock('@/hooks/auth/useProfileQuery', () => ({
  useProfileQuery: () => ({ profile: null })
}))

vi.mock('@/data/applications', () => ({
  applicationsData: {
    useCreate: () => ({
      mutateAsync: vi.fn().mockResolvedValue({
        id: 'new-app-id',
        application_number: 'APP001',
        public_tracking_code: 'TRK123'
      })
    }),
    useUpdate: () => ({
      mutateAsync: vi.fn().mockResolvedValue({
        id: 'existing-app-id',
        application_number: 'APP002',
        public_tracking_code: 'TRK456',
        status: 'draft',
        payment_status: 'pending_review'
      })
    }),
    useSyncGrades: () => ({ mutateAsync: vi.fn() }),
    useList: () => ({ data: { applications: [] } })
  }
}))

vi.mock('@/data/catalog', () => ({
  catalogData: {
    usePrograms: () => ({
      data: {
        programs: [
          { id: '1', name: 'Clinical Medicine', institutions: { name: 'MIHAS' } }
        ]
      }
    }),
    useIntakes: () => ({
      data: {
        intakes: [
          { id: '1', name: 'January 2026', year: 2026, displayName: 'January 2026' }
        ]
      }
    }),
    useSubjects: () => ({ data: { subjects: [] } })
  }
}))

vi.mock('@/hooks/useProfileAutoPopulation', () => ({
  useProfileAutoPopulation: () => ({
    completionPercentage: 0,
    hasAutoPopulatedData: false
  }),
  getBestValue: (a: any, b: any, c: any) => a || b || c,
  getUserMetadata: () => ({})
}))

vi.mock('@/lib/applicationNumberGenerator', () => ({
  generateApplicationNumber: () => 'APP001'
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null })
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}))

describe('useWizardController - handleNextStep', () => {
  let mockCreateApplication: any
  let mockUpdateApplication: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get fresh mocks for each test
    const { applicationsData } = require('@/data/applications')
    mockCreateApplication = applicationsData.useCreate().mutateAsync
    mockUpdateApplication = applicationsData.useUpdate().mutateAsync
  })

  it('should create new application when applicationId is not defined', async () => {
    const { result } = renderHook(() => useWizardController())

    // Fill required form data
    act(() => {
      result.current.form.setValue('full_name', 'John Doe')
      result.current.form.setValue('date_of_birth', '1990-01-01')
      result.current.form.setValue('sex', 'Male')
      result.current.form.setValue('phone', '0977123456')
      result.current.form.setValue('email', 'john@example.com')
      result.current.form.setValue('residence_town', 'Lusaka')
      result.current.form.setValue('program', 'Clinical Medicine')
      result.current.form.setValue('intake', 'January 2026')
      result.current.form.setValue('nrc_number', '123456/12/1')
    })

    // Call handleNextStep from Step 1 (basicKyc)
    await act(async () => {
      await result.current.handleNextStep()
    })

    // Should call createApplication, not updateApplication
    expect(mockCreateApplication).toHaveBeenCalledWith({
      application_number: 'APP001',
      public_tracking_code: expect.stringMatching(/^TRK[A-Z0-9]{6}$/),
      full_name: 'John Doe',
      nrc_number: '123456/12/1',
      passport_number: null,
      date_of_birth: '1990-01-01',
      sex: 'Male',
      phone: '0977123456',
      email: 'john@example.com',
      residence_town: 'Lusaka',
      next_of_kin_name: null,
      next_of_kin_phone: null,
      program: 'Clinical Medicine',
      intake: 'January 2026',
      institution: 'MIHAS',
      status: 'draft'
    })

    expect(mockUpdateApplication).not.toHaveBeenCalled()
  })

  it('should update existing application when applicationId is defined', async () => {
    const { result } = renderHook(() => useWizardController())

    // Simulate existing application by setting applicationId
    act(() => {
      // Access the internal state setter (this would normally be set during draft loading)
      const setApplicationId = (result.current as any).setApplicationId || (() => {})
      if (typeof setApplicationId === 'function') {
        setApplicationId('existing-app-id')
      }
    })

    // Fill required form data
    act(() => {
      result.current.form.setValue('full_name', 'Jane Doe Updated')
      result.current.form.setValue('date_of_birth', '1990-01-01')
      result.current.form.setValue('sex', 'Female')
      result.current.form.setValue('phone', '0966987654')
      result.current.form.setValue('email', 'jane@example.com')
      result.current.form.setValue('residence_town', 'Ndola')
      result.current.form.setValue('program', 'Clinical Medicine')
      result.current.form.setValue('intake', 'January 2026')
      result.current.form.setValue('nrc_number', '987654/21/1')
    })

    // Mock the internal applicationId state
    Object.defineProperty(result.current, 'applicationId', {
      value: 'existing-app-id',
      writable: false
    })

    // Call handleNextStep from Step 1 (basicKyc)
    await act(async () => {
      await result.current.handleNextStep()
    })

    // Should call updateApplication, not createApplication
    expect(mockUpdateApplication).toHaveBeenCalledWith({
      id: 'existing-app-id',
      data: {
        full_name: 'Jane Doe Updated',
        nrc_number: '987654/21/1',
        passport_number: null,
        date_of_birth: '1990-01-01',
        sex: 'Female',
        phone: '0966987654',
        email: 'jane@example.com',
        residence_town: 'Ndola',
        next_of_kin_name: null,
        next_of_kin_phone: null,
        program: 'Clinical Medicine',
        intake: 'January 2026',
        institution: 'MIHAS'
      }
    })

    expect(mockCreateApplication).not.toHaveBeenCalled()
  })

  it('should preserve existing application_number and tracking_code when updating', async () => {
    const { result } = renderHook(() => useWizardController())

    // Mock existing application data
    mockUpdateApplication.mockResolvedValue({
      id: 'existing-app-id',
      application_number: 'EXISTING_APP_002',
      public_tracking_code: 'EXISTING_TRK456',
      status: 'draft',
      payment_status: 'pending_review'
    })

    // Fill required form data
    act(() => {
      result.current.form.setValue('full_name', 'Updated Name')
      result.current.form.setValue('date_of_birth', '1990-01-01')
      result.current.form.setValue('sex', 'Male')
      result.current.form.setValue('phone', '0977123456')
      result.current.form.setValue('email', 'test@example.com')
      result.current.form.setValue('residence_town', 'Lusaka')
      result.current.form.setValue('program', 'Clinical Medicine')
      result.current.form.setValue('intake', 'January 2026')
      result.current.form.setValue('nrc_number', '123456/12/1')
    })

    // Mock the internal applicationId state
    Object.defineProperty(result.current, 'applicationId', {
      value: 'existing-app-id',
      writable: false
    })

    // Call handleNextStep from Step 1 (basicKyc)
    await act(async () => {
      await result.current.handleNextStep()
    })

    // Verify that submittedApplication contains the existing identifiers
    expect(result.current.submittedApplication).toMatchObject({
      applicationNumber: 'EXISTING_APP_002',
      trackingCode: 'EXISTING_TRK456',
      fullName: 'Updated Name',
      status: 'draft'
    })
  })

  it('should validate required fields before proceeding', async () => {
    const { result } = renderHook(() => useWizardController())

    // Don't fill required fields
    act(() => {
      result.current.form.setValue('full_name', '')
    })

    // Call handleNextStep from Step 1 (basicKyc)
    await act(async () => {
      await result.current.handleNextStep()
    })

    // Should show validation error and not call create/update
    expect(result.current.error).toContain('Please fill in all required fields')
    expect(mockCreateApplication).not.toHaveBeenCalled()
    expect(mockUpdateApplication).not.toHaveBeenCalled()
  })

  it('should validate NRC or Passport requirement', async () => {
    const { result } = renderHook(() => useWizardController())

    // Fill all required fields except NRC/Passport
    act(() => {
      result.current.form.setValue('full_name', 'John Doe')
      result.current.form.setValue('date_of_birth', '1990-01-01')
      result.current.form.setValue('sex', 'Male')
      result.current.form.setValue('phone', '0977123456')
      result.current.form.setValue('email', 'john@example.com')
      result.current.form.setValue('residence_town', 'Lusaka')
      result.current.form.setValue('program', 'Clinical Medicine')
      result.current.form.setValue('intake', 'January 2026')
      // Don't set nrc_number or passport_number
    })

    // Call handleNextStep from Step 1 (basicKyc)
    await act(async () => {
      await result.current.handleNextStep()
    })

    // Should show NRC/Passport validation error
    expect(result.current.error).toBe('Either NRC or Passport number is required')
    expect(mockCreateApplication).not.toHaveBeenCalled()
    expect(mockUpdateApplication).not.toHaveBeenCalled()
  })
})