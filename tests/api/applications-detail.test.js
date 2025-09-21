import { describe, it, expect, vi, beforeEach } from 'vitest'
import './setup.js'

const detailHandler = vi.fn(async (req, res) => {
  res.status(200).json({ receivedId: req.params.id })
})

describe('applications detail Netlify function', () => {
  beforeEach(() => {
    detailHandler.mockClear()
  })

  it('passes path parameter IDs through to the handler', async () => {
    const { createApplicationsIdHandler } = await import('../../netlify/functions/applications-id.js')
    const handler = createApplicationsIdHandler(detailHandler)

    const event = {
      httpMethod: 'GET',
      path: '/api/applications/app-123',
      headers: {},
      queryStringParameters: {}
    }

    const response = await handler(event, {})

    expect(detailHandler).toHaveBeenCalledTimes(1)
    expect(detailHandler.mock.calls[0][0].params.id).toBe('app-123')
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ receivedId: 'app-123' })
  })

  it('uses query string ID when invoked via direct function path', async () => {
    const { createApplicationsIdHandler } = await import('../../netlify/functions/applications-id.js')
    const handler = createApplicationsIdHandler(detailHandler)

    const event = {
      httpMethod: 'GET',
      path: '/.netlify/functions/applications-id',
      headers: {},
      queryStringParameters: { id: 'app-456' }
    }

    const response = await handler(event, {})

    expect(detailHandler).toHaveBeenCalledTimes(1)
    expect(detailHandler.mock.calls[0][0].params.id).toBe('app-456')
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ receivedId: 'app-456' })
  })
})
