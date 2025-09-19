import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { VariableSizeList as List, type ListChildComponentProps } from 'react-window'
import { sanitizeHtml } from '@/lib/sanitizer'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export interface ApplicationSummary {
  id: string
  application_number: string
  full_name: string
  email: string
  phone: string
  program: string
  intake: string
  institution: string
  status: string
  payment_status: string
  payment_verified_at: string | null
  payment_verified_by: string | null
  payment_verified_by_name: string | null
  payment_verified_by_email: string | null
  last_payment_audit_id: number | null
  last_payment_audit_at: string | null
  last_payment_audit_by_name: string | null
  last_payment_audit_by_email: string | null
  last_payment_audit_notes: string | null
  last_payment_reference: string | null
  application_fee: number
  paid_amount: number
  submitted_at: string
  created_at: string
  result_slip_url: string
  extra_kyc_url: string
  pop_url: string
  grades_summary: string
  total_subjects: number
  average_grade: number
  days_since_submission: number
}

interface ApplicationsTableProps {
  applications: ApplicationSummary[]
  totalCount: number
  loadedCount: number
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void | Promise<void>
  onStatusUpdate: (id: string, status: string) => void
  onPaymentStatusUpdate: (id: string, status: string) => void
  onApplicationSelect?: (application: ApplicationSummary) => void
}

const ESTIMATED_ROW_HEIGHT = 184

type RowData = {
  applications: ApplicationSummary[]
  formatDateTime: (value?: string | null) => string | null
  getStatusBadge: (status: string) => JSX.Element
  getPaymentBadge: (status: string) => JSX.Element
  onStatusUpdate: (id: string, status: string) => void
  onPaymentStatusUpdate: (id: string, status: string) => void
  setSize: (index: number, size: number) => void
  onApplicationSelect?: (application: ApplicationSummary) => void
}

export function ApplicationsTable({
  applications,
  totalCount,
  loadedCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onStatusUpdate,
  onPaymentStatusUpdate,
  onApplicationSelect
}: ApplicationsTableProps) {
  const formatDateTime = useCallback((value?: string | null) => {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString()
  }, [])

  const getStatusBadge = useCallback((status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.draft}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }, [])

  const getPaymentBadge = useCallback((paymentStatus: string) => {
    const colors = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[paymentStatus as keyof typeof colors] || colors.pending_review}`}>
        {paymentStatus.replace('_', ' ').toUpperCase()}
      </span>
    )
  }, [])

  const listRef = useRef<List>(null)
  const sizeMapRef = useRef<Record<number, number>>({})

  const getItemSize = useCallback((index: number) => {
    return sizeMapRef.current[index] ?? ESTIMATED_ROW_HEIGHT
  }, [])

  const setSize = useCallback((index: number, size: number) => {
    if (sizeMapRef.current[index] === size) {
      return
    }

    sizeMapRef.current[index] = size
    listRef.current?.resetAfterIndex(index)
  }, [])

  const listHeight = useMemo(() => {
    if (applications.length === 0) {
      return 240
    }
    const visibleCount = Math.min(applications.length, 6)
    return Math.min(Math.max(visibleCount * ESTIMATED_ROW_HEIGHT, 240), 720)
  }, [applications.length])

  const rowData = useMemo<RowData>(() => ({
    applications,
    formatDateTime,
    getStatusBadge,
    getPaymentBadge,
    onStatusUpdate,
    onPaymentStatusUpdate,
    setSize,
    onApplicationSelect
  }), [applications, formatDateTime, getPaymentBadge, getStatusBadge, onApplicationSelect, onPaymentStatusUpdate, onStatusUpdate, setSize])

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[1024px]">
          <div className="hidden bg-gray-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 md:grid md:grid-cols-[minmax(160px,1fr)_minmax(220px,1.4fr)_minmax(200px,1.2fr)_minmax(170px,1fr)_minmax(220px,1.3fr)_minmax(200px,1fr)_minmax(160px,0.8fr)]">
            <div>Application</div>
            <div>Student</div>
            <div>Program</div>
            <div>Status</div>
            <div>Payment</div>
            <div>Subjects</div>
            <div>Actions</div>
          </div>

          {applications.length > 0 ? (
            <List
              ref={listRef}
              height={listHeight}
              itemCount={applications.length}
              itemSize={getItemSize}
              estimatedItemSize={ESTIMATED_ROW_HEIGHT}
              width="100%"
              itemData={rowData}
              overscanCount={5}
              itemKey={(index) => applications[index]?.id ?? index}
            >
              {ApplicationRow}
            </List>
          ) : (
            <div className="text-center py-12 text-sm text-gray-500">
              No applications found matching your criteria.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-700">{loadedCount}</span>
          {totalCount > 0 && (
            <>
              {' '}of{' '}
              <span className="font-semibold text-gray-700">{totalCount}</span>
            </>
          )}{' '}
          applications
        </div>

        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoadingMore && <LoadingSpinner size="sm" className="mr-2" />}
            {isLoadingMore ? 'Loading more...' : 'Load more applications'}
          </button>
        ) : (
          totalCount > 0 && (
            <span className="text-sm text-gray-400">All applications loaded.</span>
          )
        )}
      </div>
    </div>
  )
}

const ApplicationRow: React.FC<ListChildComponentProps<RowData>> = ({ index, style, data }) => {
  const app = data.applications[index]
  const rowRef = useRef<HTMLDivElement | null>(null)

  const measure = useCallback(() => {
    const node = rowRef.current
    if (!node) {
      return
    }

    const height = Math.ceil(node.getBoundingClientRect().height)
    if (height > 0) {
      data.setSize(index, height)
    }
  }, [data, index])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const node = rowRef.current
    if (!node) {
      return
    }

    let frameId: number | null = null

    const scheduleMeasure = () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        measure()
      })
    }

    scheduleMeasure()

    let resizeObserver: ResizeObserver | null = null

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure()
      })
      resizeObserver.observe(node)
    }

    const handleWindowResize = () => {
      scheduleMeasure()
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }

      window.removeEventListener('resize', handleWindowResize)

      if (frameId) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [measure])

  const handleRowClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!data.onApplicationSelect || !app) {
      return
    }

    const interactiveTarget = (event.target as HTMLElement).closest('button, a, select, [role="button"], input, label')
    if (interactiveTarget) {
      return
    }

    data.onApplicationSelect(app)
  }, [app, data])

  const handleRowKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!data.onApplicationSelect || !app) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      data.onApplicationSelect(app)
    }
  }, [app, data])

  if (!app) {
    return null
  }

  const verifiedAt = app.payment_status === 'verified' ? data.formatDateTime(app.payment_verified_at) : null
  const ledgerAt = app.payment_status === 'verified' ? data.formatDateTime(app.last_payment_audit_at) : null

  return (
    <div style={style}>
      <div
        ref={rowRef}
        className="border-b border-gray-100 bg-white px-4 sm:px-6 py-4 hover:bg-gray-50"
        onClick={handleRowClick}
        role={data.onApplicationSelect ? 'button' : undefined}
        tabIndex={data.onApplicationSelect ? 0 : undefined}
        onKeyDown={handleRowKeyDown}
      >
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(160px,1fr)_minmax(220px,1.4fr)_minmax(200px,1.2fr)_minmax(170px,1fr)_minmax(220px,1.3fr)_minmax(200px,1fr)_minmax(160px,0.8fr)] md:gap-6">
          <div className="space-y-2">
            <div className="md:hidden text-xs font-semibold uppercase text-gray-500">Application</div>
            <div className="text-sm font-medium text-gray-900">{app.application_number}</div>
            <div className="text-sm text-gray-500">
              {new Date(app.submitted_at || app.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="space-y-2">
            <div className="md:hidden text-xs font-semibold uppercase text-gray-500">Student</div>
            <div className="text-sm font-medium text-gray-900">{app.full_name}</div>
            <div className="text-sm text-gray-500">{app.email}</div>
            <div className="text-sm text-gray-500">{app.phone}</div>
          </div>

          <div className="space-y-2">
            <div className="md:hidden text-xs font-semibold uppercase text-gray-500">Program</div>
            <div className="text-sm font-medium text-gray-900">{app.program}</div>
            <div className="text-sm text-gray-500">{app.institution} • {app.intake}</div>
          </div>

          <div className="space-y-3">
            <div className="md:hidden text-xs font-semibold uppercase text-gray-500">Status</div>
            {data.getStatusBadge(app.status)}
            <select
              value={app.status}
              onChange={(e) => data.onStatusUpdate(app.id, e.target.value)}
              className="block w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="md:hidden text-xs font-semibold uppercase text-gray-500">Payment</div>
            {data.getPaymentBadge(app.payment_status)}
            <div className="text-xs text-gray-500">
              K{app.paid_amount || 0} / K{app.application_fee}
            </div>
            {app.payment_status === 'verified' && (verifiedAt || ledgerAt) && (
              <div className="text-xs text-green-700 space-y-1">
                {verifiedAt && (
                  <div>
                    Verified {verifiedAt}
                    {(app.payment_verified_by_name || app.payment_verified_by_email) && (
                      <>
                        {' '}by{' '}
                        {app.payment_verified_by_name || app.payment_verified_by_email}
                      </>
                    )}
                  </div>
                )}
                {ledgerAt && (
                  <div className="text-xs text-gray-500">
                    Ledger entry: {ledgerAt}
                    {app.last_payment_reference && (
                      <>
                        {' '}
                        <span className="text-gray-400">(Ref: {app.last_payment_reference})</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <select
              value={app.payment_status}
              onChange={(e) => data.onPaymentStatusUpdate(app.id, e.target.value)}
              className="block w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="pending_review">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="md:hidden text-xs font-semibold uppercase text-gray-500">Subjects</div>
            <div className="text-sm text-gray-900">{app.total_subjects} subjects</div>
            {app.grades_summary && (
              <div
                className="text-xs text-gray-500 max-w-xs truncate"
                title={sanitizeHtml(app.grades_summary)}
              >
                {sanitizeHtml(app.grades_summary)}
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm font-medium">
            <div className="md:hidden text-xs font-semibold uppercase text-gray-500">Actions</div>
            <div className="flex flex-col space-y-1">
              {data.onApplicationSelect && (
                <button
                  type="button"
                  onClick={() => data.onApplicationSelect?.(app)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-900 text-left"
                >
                  View details
                </button>
              )}
              {app.result_slip_url && (
                <a
                  href={app.result_slip_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-900 text-xs"
                >
                  Result Slip
                </a>
              )}
              {app.extra_kyc_url && (
                <a
                  href={app.extra_kyc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-900 text-xs"
                >
                  Extra KYC
                </a>
              )}
              {app.pop_url && (
                <a
                  href={app.pop_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-900 text-xs"
                >
                  Proof of Payment
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
