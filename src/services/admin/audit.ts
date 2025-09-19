import { apiClient } from '../client'

export interface AuditLogEntry {
  id: string
  action: string
  actorId: string | null
  actorEmail: string | null
  actorRoles: string[]
  targetTable: string | null
  targetId: string | null
  targetLabel: string | null
  requestId: string | null
  requestIp: string | null
  userAgent: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  page: number
  pageSize: number
  totalPages: number
  totalCount: number
}

export interface AuditLogFilters {
  action?: string
  actorId?: string
  targetTable?: string
  targetId?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

function buildQuery(params: AuditLogFilters = {}): string {
  const searchParams = new URLSearchParams()

  if (params.action) searchParams.set('logAction', params.action)
  if (params.actorId) searchParams.set('actorId', params.actorId)
  if (params.targetTable) searchParams.set('targetTable', params.targetTable)
  if (params.targetId) searchParams.set('targetId', params.targetId)
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export const adminAuditService = {
  async list(params: AuditLogFilters = {}): Promise<AuditLogResponse> {
    const query = buildQuery(params)
    const url = `/api/admin?action=audit-log${query ? `&${query.slice(1)}` : ''}`
    return apiClient.request(url, {
      method: 'GET'
    })
  }
}
