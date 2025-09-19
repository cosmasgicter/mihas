import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  adminAuditService,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditLogResponse
} from '@/services/admin/audit'

const DEFAULT_PAGE_SIZE = 25

function sanitizeFilters(filters: AuditLogFilters): AuditLogFilters {
  const entries = Object.entries(filters).filter(([, value]) => {
    if (value === undefined || value === null) {
      return false
    }
    if (typeof value === 'string') {
      return value.trim().length > 0
    }
    return true
  })

  return Object.fromEntries(entries)
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const relativeTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })
    } catch {
      return entry.createdAt
    }
  }, [entry.createdAt])

  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-gray-900">{entry.action}</div>
        <div className="text-xs text-gray-500">{relativeTime}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-sm text-gray-800">{entry.actorEmail ?? '—'}</div>
        <div className="text-xs text-gray-500">{entry.actorId ?? 'unknown'}</div>
        {entry.actorRoles?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {entry.actorRoles.map(role => (
              <span
                key={role}
                className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                {role}
              </span>
            ))}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-sm text-gray-800">{entry.targetTable ?? '—'}</div>
        <div className="text-xs text-gray-500">{entry.targetId ?? '—'}</div>
        {entry.targetLabel ? <div className="text-xs text-gray-400">{entry.targetLabel}</div> : null}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-xs text-gray-500">Request ID: {entry.requestId ?? '—'}</div>
        <div className="text-xs text-gray-500">IP: {entry.requestIp ?? '—'}</div>
        <div className="text-xs text-gray-400 truncate max-w-xs">UA: {entry.userAgent ?? '—'}</div>
      </td>
      <td className="px-4 py-3 align-top text-xs text-gray-700">
        <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[11px] leading-snug">
          {JSON.stringify(entry.metadata ?? {}, null, 2)}
        </pre>
      </td>
    </tr>
  )
}

export default function AuditTrailPage() {
  const [formFilters, setFormFilters] = useState({
    action: '',
    actorId: '',
    targetTable: '',
    targetId: '',
    from: '',
    to: ''
  })
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [response, setResponse] = useState<AuditLogResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAuditEntries = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const payload = await adminAuditService.list({
        ...appliedFilters,
        page,
        pageSize
      })
      setResponse(payload)
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Failed to load audit log entries'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters, page, pageSize])

  useEffect(() => {
    void loadAuditEntries()
  }, [loadAuditEntries])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setAppliedFilters(sanitizeFilters(formFilters))
  }

  const handleReset = () => {
    setFormFilters({ action: '', actorId: '', targetTable: '', targetId: '', from: '', to: '' })
    setPage(1)
    setAppliedFilters({})
  }

  const canGoBack = (response?.page ?? 1) > 1
  const canGoForward = (response?.page ?? 1) < (response?.totalPages ?? 1)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review privileged operations across the platform. Filters and pagination ensure you only load
            the events you need.
          </p>
        </header>

        <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Action prefix</label>
              <Input
                value={formFilters.action}
                onChange={event => setFormFilters(filters => ({ ...filters, action: event.target.value }))}
                placeholder="e.g. applications.status"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Actor ID</label>
              <Input
                value={formFilters.actorId}
                onChange={event => setFormFilters(filters => ({ ...filters, actorId: event.target.value }))}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Target table</label>
              <Input
                value={formFilters.targetTable}
                onChange={event => setFormFilters(filters => ({ ...filters, targetTable: event.target.value }))}
                placeholder="applications_new"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Target ID</label>
              <Input
                value={formFilters.targetId}
                onChange={event => setFormFilters(filters => ({ ...filters, targetId: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">From</label>
              <Input
                type="datetime-local"
                value={formFilters.from}
                onChange={event => setFormFilters(filters => ({ ...filters, from: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">To</label>
              <Input
                type="datetime-local"
                value={formFilters.to}
                onChange={event => setFormFilters(filters => ({ ...filters, to: event.target.value }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="primary">
                Apply filters
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Audit events</h2>
              <p className="text-sm text-gray-500">
                Showing page {response?.page ?? 1} of {response?.totalPages ?? 1} • {response?.totalCount ?? 0}{' '}
                events total
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Page size</label>
              <Input
                type="number"
                min={5}
                max={100}
                value={pageSize}
                onChange={event => {
                  const next = Number.parseInt(event.target.value, 10)
                  if (!Number.isNaN(next)) {
                    setPageSize(Math.min(Math.max(next, 5), 100))
                    setPage(1)
                  }
                }}
                className="w-20"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner label="Loading audit records" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : response?.data?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Action</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Actor</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Target</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Request</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Metadata</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {response.data.map(entry => (
                    <AuditRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              No audit events matched your filters.
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button type="button" variant="outline" disabled={!canGoBack} onClick={() => canGoBack && setPage(page - 1)}>
              Previous
            </Button>
            <div className="text-sm text-gray-500">
              Page {response?.page ?? page} of {response?.totalPages ?? 1}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!canGoForward}
              onClick={() => canGoForward && setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
