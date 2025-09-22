import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, mockSupabaseClient, createMockQueryBuilder } from './setup.js'

let handler
let testables
let mockGetUser

async function loadHandler() {
  const module = await import('../../api/applications/index.js')
  return module.default ?? module
}

beforeEach(async () => {
  vi.resetModules()
  handler = await loadHandler()
  testables = handler.__testables__

  vi.clearAllMocks()
  mockSupabaseClient.from.mockImplementation(() => createMockQueryBuilder())

  mockGetUser = vi.fn().mockResolvedValue({ user: { id: '123' }, roles: ['student'], isAdmin: false })
  testables.setDependencies({
    supabaseClient: mockSupabaseClient,
    getUserFromRequest: mockGetUser
  })
})


describe('Applications API', () => {
  describe('GET /api/applications', () => {
    it('restricts non-admin requests to their own applications by default', async () => {
      const dataBuilder = createMockQueryBuilder()
      dataBuilder.execute.mockResolvedValue({ data: [], error: null, count: 0 })

      mockSupabaseClient.from
        .mockImplementationOnce(() => dataBuilder)

      const req = createMockReq({
        method: 'GET'
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(dataBuilder.eq).toHaveBeenCalledWith('user_id', '123')
    })

    it('applies filters and pagination', async () => {
      const dataBuilder = createMockQueryBuilder()
      dataBuilder.execute.mockResolvedValue({
        data: [{ id: '1', status: 'approved' }],
        error: null,
        count: 1
      })

      mockSupabaseClient.from
        .mockImplementationOnce(() => dataBuilder)

      const req = createMockReq({
        method: 'GET',
        query: {
          search: 'John%',
          program: 'Clinical Medicine',
          institution: 'MIHAS',
          paymentStatus: 'verified',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          status: 'approved',
          mine: 'true',
          page: '0',
          pageSize: '10'
        }
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(mockSupabaseClient.from).toHaveBeenNthCalledWith(1, 'applications_new')
      expect(dataBuilder.eq).toHaveBeenCalledWith('user_id', '123')
      expect(dataBuilder.eq).toHaveBeenCalledWith('status', 'approved')
      expect(dataBuilder.eq).toHaveBeenCalledWith('program', 'Clinical Medicine')
      expect(dataBuilder.eq).toHaveBeenCalledWith('institution', 'MIHAS')
      expect(dataBuilder.eq).toHaveBeenCalledWith('payment_status', 'verified')
      expect(dataBuilder.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(dataBuilder.lte).toHaveBeenCalledWith('created_at', '2024-01-31')
      expect(dataBuilder.or).toHaveBeenCalledWith('full_name.ilike.%John\\%%,email.ilike.%John\\%%,application_number.ilike.%John\\%%')
      expect(dataBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(dataBuilder.range).toHaveBeenCalledWith(0, 9)

      const payload = JSON.parse(res.body)
      expect(payload.applications).toHaveLength(1)
      expect(payload.totalCount).toBe(1)
      expect(payload.page).toBe(0)
      expect(payload.pageSize).toBe(10)
      expect(payload.stats).toBeUndefined()
    })

    it('mirrors custom sort selection', async () => {
      const dataBuilder = createMockQueryBuilder()
      dataBuilder.execute.mockResolvedValue({ data: [], error: null, count: 0 })

      mockSupabaseClient.from
        .mockImplementationOnce(() => dataBuilder)

      const req = createMockReq({
        method: 'GET',
        query: {
          sortBy: 'name',
          sortOrder: 'asc'
        }
      })
      const res = createMockRes()

      await handler(req, res)

      expect(dataBuilder.order).toHaveBeenCalledWith('full_name', { ascending: true })
    })

    it('allows admins to fetch all applications without mine flag', async () => {
      const dataBuilder = createMockQueryBuilder()
      dataBuilder.execute.mockResolvedValue({ data: [], error: null, count: 0 })

      mockSupabaseClient.from
        .mockImplementationOnce(() => dataBuilder)

      mockGetUser.mockResolvedValueOnce({ user: { id: 'admin-1' }, roles: ['admin'], isAdmin: true })

      const req = createMockReq({
        method: 'GET'
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(dataBuilder.eq).not.toHaveBeenCalledWith('user_id', 'admin-1')
    })

    it('includes status breakdown when requested', async () => {
      const dataBuilder = createMockQueryBuilder()
      dataBuilder.execute.mockResolvedValue({ data: [], error: null, count: 0 })

      const baseCountBuilder = createMockQueryBuilder()
      baseCountBuilder.execute.mockResolvedValue({ data: [], error: null, count: 5 })

      const statusBuilders = ['draft', 'submitted', 'under_review', 'approved', 'rejected'].map((statusValue, index) => {
        const builder = createMockQueryBuilder()
        builder.execute.mockResolvedValue({ data: [], error: null, count: index + 1 })
        return builder
      })

      mockSupabaseClient.from
        .mockImplementationOnce(() => dataBuilder)
        .mockImplementationOnce(() => baseCountBuilder)

      statusBuilders.forEach(builder => {
        mockSupabaseClient.from.mockImplementationOnce(() => builder)
      })

      const req = createMockReq({
        method: 'GET',
        query: {
          includeStats: 'true',
          status: 'approved'
        }
      })
      const res = createMockRes()

      await handler(req, res)

      expect(baseCountBuilder.eq).not.toHaveBeenCalledWith('status', 'approved')
      expect(statusBuilders[0].eq).toHaveBeenCalledWith('status', 'draft')
      expect(statusBuilders[3].eq).toHaveBeenCalledWith('status', 'approved')

      const payload = JSON.parse(res.body)
      expect(payload.stats).toEqual({
        total: 5,
        statusBreakdown: {
          draft: 1,
          submitted: 2,
          under_review: 3,
          approved: 4,
          rejected: 5
        }
      })
    })
  })

  describe('POST /api/applications', () => {
    it('creates a new application record', async () => {
      const insertBuilder = createMockQueryBuilder()
      insertBuilder.insert.mockReturnValue(insertBuilder)
      insertBuilder.select.mockReturnValue(insertBuilder)
      insertBuilder.single.mockResolvedValue({ data: { id: 'app-1' }, error: null })

      mockSupabaseClient.from
        .mockImplementationOnce(() => insertBuilder)

      const req = createMockReq({
        method: 'POST',
        body: JSON.stringify({
          programId: 'prog-1',
          firstName: 'John',
          lastName: 'Doe'
        })
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.statusCode).toBe(201)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('applications_new')
    })
  })
})


