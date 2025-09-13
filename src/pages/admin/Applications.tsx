import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Application, Program, Intake } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { formatDate, getStatusColor } from '@/lib/utils'
import { sanitizeForLog } from '@/lib/sanitize'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Calendar,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Star,
  TrendingUp,
  Users,
  FileCheck,
  Zap,
  Settings,
  RefreshCw,
  Archive,
  Send,
  Trash2,
  Edit3,
  ExternalLink
} from 'lucide-react'

interface ApplicationWithDetails {
  id: string
  application_number: string
  user_id: string
  full_name: string
  nrc_number?: string
  passport_number?: string
  date_of_birth: string
  sex: string
  phone: string
  email: string
  residence_town: string
  guardian_name?: string
  guardian_phone?: string
  program: string
  intake: string
  institution: string
  result_slip_url?: string
  extra_kyc_url?: string
  application_fee?: number
  payment_method?: string
  payer_name?: string
  payer_phone?: string
  amount?: number
  paid_at?: string
  momo_ref?: string
  pop_url?: string
  payment_status: string
  status: string
  submitted_at?: string
  public_tracking_code?: string
  created_at: string
  updated_at: string
  document_count?: number
}

const PAGE_SIZE = 15

export default function AdminApplications() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showStats, setShowStats] = useState(true)

  const fetchApplications = async (page: number, status: string, search: string) => {
    const start = page * PAGE_SIZE
    const end = start + PAGE_SIZE - 1
    
    let query = supabase
      .from('applications_new')
      .select(`
        *
      `, { count: 'exact' })
      .range(start, end)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&').replace(/'/g, "''")
      query = query.or(`full_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,application_number.ilike.%${sanitizedSearch}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { applications: data || [], totalCount: count || 0 }
  }

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('applications_new')
      .select('status')
    
    if (error) throw error
    
    const stats = {
      total: data.length,
      submitted: data.filter(app => app.status === 'submitted').length,
      under_review: data.filter(app => app.status === 'under_review').length,
      approved: data.filter(app => app.status === 'approved').length,
      rejected: data.filter(app => app.status === 'rejected').length
    }
    
    return stats
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['applications', currentPage, statusFilter, searchTerm],
    queryFn: () => fetchApplications(currentPage, statusFilter, searchTerm),
    staleTime: 30000, // 30 seconds
  })

  const { data: stats } = useQuery({
    queryKey: ['application-stats'],
    queryFn: fetchStats,
    staleTime: 60000, // 1 minute
  })

  const applications = data?.applications || []
  const totalCount = data?.totalCount || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const updateApplicationStatus = async (applicationId: string, newStatus: string, feedback?: string) => {
    try {
      setUpdating(applicationId)
      
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'under_review' && { review_started_at: new Date().toISOString() }),
        ...((['approved', 'rejected'].includes(newStatus)) && { decision_date: new Date().toISOString() })
      }
      
      if (feedback) {
        updateData.admin_feedback = feedback
        updateData.admin_feedback_date = new Date().toISOString()
        updateData.admin_feedback_by = user?.id
      }

      const { error } = await supabase
        .from('applications_new')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      // Invalidate and refetch applications
      queryClient.invalidateQueries({ queryKey: ['applications'] })

      // Create status history record
      const { error: historyError } = await supabase
        .from('application_status_history')
        .insert({
          application_id: applicationId,
          status: newStatus,
          changed_by: user?.id,
          notes: feedback || null
        })
      
      if (historyError) {
        console.error('Error creating status history:', sanitizeForLog(historyError.message || 'unknown error'))
        // Continue execution as this is not critical for the main operation
      }
      
    } catch (error: any) {
      console.error('Error updating application status:', error)
    } finally {
      setUpdating(null)
    }
  }

  const submitFeedback = async () => {
    if (!selectedApplication || !feedbackText.trim()) return
    
    try {
      setFeedbackLoading(true)
      
      const { error } = await supabase
        .from('applications_new')
        .update({
          admin_feedback: feedbackText,
          admin_feedback_date: new Date().toISOString(),
          admin_feedback_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApplication.id)

      if (error) throw error

      // Invalidate and refetch applications
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['application-stats'] })

      setShowFeedbackModal(false)
      setFeedbackText('')
      
    } catch (error: any) {
      console.error('Error submitting feedback:', error)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedApplications.length === 0) return
    
    try {
      setBulkActionLoading(true)
      
      const updates = selectedApplications.map(id => 
        supabase
          .from('applications_new')
          .update({
            status: action,
            updated_at: new Date().toISOString(),
            ...(action === 'under_review' && { review_started_at: new Date().toISOString() }),
            ...((['approved', 'rejected'].includes(action)) && { decision_date: new Date().toISOString() })
          })
          .eq('id', id)
      )
      
      await Promise.all(updates)
      
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['application-stats'] })
      
      setSelectedApplications([])
      setShowBulkActions(false)
      
    } catch (error: any) {
      console.error('Error performing bulk action:', error)
    } finally {
      setBulkActionLoading(false)
    }
  }

  const toggleApplicationSelection = (id: string) => {
    setSelectedApplications(prev => 
      prev.includes(id) 
        ? prev.filter(appId => appId !== id)
        : [...prev, id]
    )
  }

  const selectAllApplications = () => {
    if (selectedApplications.length === applications.length) {
      setSelectedApplications([])
    } else {
      setSelectedApplications(applications.map(app => app.id))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'under_review':
        return <Clock className="h-4 w-4 text-primary" />
      case 'submitted':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-secondary" />
    }
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, statusFilter])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-lg text-secondary font-medium">Loading applications...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Enhanced Header - Mobile First */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-sm shadow-xl border-b border-white/20 safe-area-top"
      >
        <div className="container-mobile">
          <div className="flex flex-col space-y-4 py-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 sm:py-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
              <Link to="/admin" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors group touch-target">
                <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back</span>
              </Link>
              <div>
                <h1 className="text-responsive-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  🎓 Applications
                </h1>
                <p className="text-sm sm:text-lg text-secondary/80 mt-1">
                  Review and manage applications
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-end sm:space-y-2">
              <div className="text-left sm:text-right">
                <p className="text-xl sm:text-2xl font-bold text-secondary">{totalCount}</p>
                <p className="text-xs sm:text-sm text-secondary/70">Total Applications</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['applications'] })}
                className="btn-mobile touch-target"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="container-mobile py-4 sm:py-8 safe-area-bottom">
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-xl bg-red-50 border border-red-200 p-6 mb-8 shadow-lg"
            >
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div className="text-lg text-red-700 font-medium">{error.message}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Dashboard - Mobile First */}
        {showStats && stats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8"
          >
            <AnimatedCard className="bg-gradient-to-br from-blue-500 to-blue-600 text-white col-span-2 sm:col-span-1" hover3d>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm font-medium">Total</p>
                  <p className="text-xl sm:text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-200" />
              </div>
            </AnimatedCard>
            
            <AnimatedCard className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white" hover3d delay={0.1}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-xs sm:text-sm font-medium">Submitted</p>
                  <p className="text-xl sm:text-3xl font-bold">{stats.submitted}</p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-200" />
              </div>
            </AnimatedCard>
            
            <AnimatedCard className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white" hover3d delay={0.2}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs sm:text-sm font-medium">Review</p>
                  <p className="text-xl sm:text-3xl font-bold">{stats.under_review}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-200" />
              </div>
            </AnimatedCard>
            
            <AnimatedCard className="bg-gradient-to-br from-green-500 to-emerald-500 text-white" hover3d delay={0.3}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs sm:text-sm font-medium">Approved</p>
                  <p className="text-xl sm:text-3xl font-bold">{stats.approved}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-200" />
              </div>
            </AnimatedCard>
            
            <AnimatedCard className="bg-gradient-to-br from-red-500 to-pink-500 text-white" hover3d delay={0.4}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-xs sm:text-sm font-medium">Rejected</p>
                  <p className="text-xl sm:text-3xl font-bold">{stats.rejected}</p>
                </div>
                <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-200" />
              </div>
            </AnimatedCard>
          </motion.div>
        )}

        {/* Enhanced Filters and Controls - Mobile First */}
        <AnimatedCard className="mb-6 sm:mb-8" glassEffect>
          <div className="space-y-4 sm:space-y-6">
            {/* Top Controls */}
            <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <h2 className="text-lg sm:text-xl font-bold text-secondary">🔍 Search & Filter</h2>
                {selectedApplications.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center space-x-2"
                  >
                    <span className="text-sm text-secondary font-medium">
                      {selectedApplications.length} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="btn-mobile"
                    >
                      <Settings className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Bulk Actions</span>
                    </Button>
                  </motion.div>
                )}
              </div>
              
              <div className="flex items-center justify-between sm:space-x-3">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors touch-target ${
                      viewMode === 'cards' ? 'bg-white text-primary shadow-sm' : 'text-secondary'
                    }`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors touch-target ${
                      viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-secondary'
                    }`}
                  >
                    Table
                  </button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStats(!showStats)}
                  className="touch-target"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Search and Filters - Mobile First */}
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-4 sm:gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-secondary/60" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="form-input-mobile w-full pl-10 sm:pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="form-input-mobile w-full px-3 sm:px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="all">All Status</option>
                  <option value="submitted">📋 Submitted</option>
                  <option value="under_review">🔍 Under Review</option>
                  <option value="approved">✅ Approved</option>
                  <option value="rejected">❌ Rejected</option>
                </select>
              </div>
              
              {/* Sort Options */}
              <div>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-')
                    setSortBy(field as any)
                    setSortOrder(order as any)
                  }}
                  className="form-input-mobile w-full px-3 sm:px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="date-desc">📅 Newest</option>
                  <option value="date-asc">📅 Oldest</option>
                  <option value="name-asc">👤 A-Z</option>
                  <option value="name-desc">👤 Z-A</option>
                  <option value="status-asc">📊 Status</option>
                </select>
              </div>
            </div>
            
            {/* Bulk Actions */}
            <AnimatePresence>
              {showBulkActions && selectedApplications.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6"
                >
                  <h3 className="text-lg font-bold text-secondary mb-4">⚡ Bulk Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      loading={bulkActionLoading}
                      onClick={() => handleBulkAction('under_review')}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Start Review ({selectedApplications.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={bulkActionLoading}
                      onClick={() => handleBulkAction('approved')}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve ({selectedApplications.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={bulkActionLoading}
                      onClick={() => handleBulkAction('rejected')}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject ({selectedApplications.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedApplications([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </AnimatedCard>

        {/* Applications Display */}
        {applications.length === 0 ? (
          <AnimatedCard className="text-center py-16" glassEffect>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="text-8xl">📋</div>
              <h3 className="text-2xl font-bold text-secondary">
                No Applications Found
              </h3>
              <p className="text-lg text-secondary/80 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search filters to find applications'
                  : 'No applications have been submitted yet. Students can apply through the application portal.'}
              </p>
              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </motion.div>
          </AnimatedCard>
        ) : viewMode === 'cards' ? (
          /* Cards View - Mobile First */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            <AnimatePresence>
              {applications.map((application, index) => (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => toggleApplicationSelection(application.id)}
                  >
                    <AnimatedCard 
                      className={`transition-all duration-300 card-mobile ${
                        selectedApplications.includes(application.id) 
                          ? 'ring-2 ring-primary bg-blue-50' 
                          : 'hover:shadow-xl'
                      }`}
                      hover3d
                    >
                    <div className="space-y-3 sm:space-y-4">
                      {/* Header - Mobile Optimized */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 sm:space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedApplications.includes(application.id)}
                            onChange={() => toggleApplicationSelection(application.id)}
                            className="h-5 w-5 mt-1 text-primary focus:ring-primary border-gray-300 rounded touch-target"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base sm:text-lg text-secondary truncate">{application.full_name}</h3>
                            <p className="text-xs sm:text-sm text-secondary/70 font-mono">#{application.application_number}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                          <div className="text-2xl sm:hidden">
                            {getStatusIcon(application.status)}
                          </div>
                          <div className="hidden sm:block">
                            {getStatusIcon(application.status)}
                          </div>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                            getStatusColor(application.status)
                          }`}>
                            {application.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content - Mobile Optimized */}
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-secondary">
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{application.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-secondary">
                          <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{application.program}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-secondary">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{application.intake}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs sm:text-sm text-secondary">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span>Submitted {formatDate(application.submitted_at)}</span>
                        </div>
                        
                        {/* Documents - Mobile Optimized */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <div className="flex items-center space-x-2 text-xs sm:text-sm text-secondary">
                            <FileCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{(application.result_slip_url ? 1 : 0) + (application.extra_kyc_url ? 1 : 0) + (application.pop_url ? 1 : 0)} docs</span>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedApplication(application)
                                setShowDetails(true)
                              }}
                              className="touch-target p-2"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedApplication(application)
                                setShowFeedbackModal(true)
                              }}
                              className="touch-target p-2"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Action Buttons - Mobile Optimized */}
                        <div className="flex space-x-2 pt-2">
                          {application.status === 'submitted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={updating === application.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                updateApplicationStatus(application.id, 'under_review')
                              }}
                              className="btn-responsive text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Zap className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Start Review</span>
                              <span className="sm:hidden">Review</span>
                            </Button>
                          )}
                          
                          {application.status === 'under_review' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                loading={updating === application.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateApplicationStatus(application.id, 'approved')
                                }}
                                className="flex-1 text-green-600 border-green-300 hover:bg-green-50 btn-mobile"
                              >
                                <CheckCircle className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">Approve</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                loading={updating === application.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateApplicationStatus(application.id, 'rejected')
                                }}
                                className="flex-1 text-red-600 border-red-300 hover:bg-red-50 btn-mobile"
                              >
                                <XCircle className="h-4 w-4 sm:mr-1" />
                                <span className="hidden sm:inline">Reject</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </AnimatedCard>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Table View */
          <AnimatedCard className="overflow-hidden" glassEffect>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedApplications.length === applications.length && applications.length > 0}
                        onChange={selectAllApplications}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
                      👤 Applicant
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
                      🎓 Program
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
                      📊 Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
                      📅 Submitted
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-secondary uppercase tracking-wider">
                      📎 Documents
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-secondary uppercase tracking-wider">
                      ⚡ Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <AnimatePresence>
                    {applications.map((application, index) => (
                      <motion.tr 
                        key={application.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.02 }}
                        className={`hover:bg-blue-50 transition-colors ${
                          selectedApplications.includes(application.id) ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedApplications.includes(application.id)}
                            onChange={() => toggleApplicationSelection(application.id)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="font-bold text-secondary">{application.full_name}</div>
                            <div className="text-sm text-secondary/70">{application.email}</div>
                            <div className="text-xs text-secondary/60 font-mono">#{application.application_number}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="font-medium text-secondary">{application.program}</div>
                            <div className="text-sm text-secondary/70">{application.intake}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(application.status)}
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              getStatusColor(application.status)
                            }`}>
                              {application.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary">
                          {formatDate(application.submitted_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <FileCheck className="h-4 w-4 text-secondary" />
                            <span className="text-sm text-secondary">
                              {(application.result_slip_url ? 1 : 0) + (application.extra_kyc_url ? 1 : 0) + (application.pop_url ? 1 : 0)} files
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application)
                                setShowDetails(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application)
                                setShowFeedbackModal(true)
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            
                            {application.status === 'submitted' && (
                              <Button
                                variant="outline"
                                size="sm"
                                loading={updating === application.id}
                                onClick={() => updateApplicationStatus(application.id, 'under_review')}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            )}
                            
                            {application.status === 'under_review' && (
                              <div className="flex space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  loading={updating === application.id}
                                  onClick={() => updateApplicationStatus(application.id, 'approved')}
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  loading={updating === application.id}
                                  onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </AnimatedCard>
        )}
        
        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <AnimatedCard className="mt-8" glassEffect>
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="text-lg text-secondary font-medium">
                Showing <span className="font-bold">{currentPage * PAGE_SIZE + 1}</span> to{' '}
                <span className="font-bold">{Math.min((currentPage + 1) * PAGE_SIZE, totalCount)}</span> of{' '}
                <span className="font-bold">{totalCount}</span> applications
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span>Previous</span>
                </Button>
                
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = currentPage < 3 ? i : currentPage - 2 + i
                    if (pageNum >= totalPages) return null
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10 h-10"
                      >
                        {pageNum + 1}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </AnimatedCard>
        )}

      </main>

      {/* Application Details Modal */}
      {showDetails && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-secondary">
                  Application #{selectedApplication.application_number}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Applicant Info */}
              <div>
                <h3 className="text-lg font-medium text-secondary mb-3">Applicant Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary">Name:</span>
                    <span className="ml-2 font-medium">{selectedApplication.full_name}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Email:</span>
                    <span className="ml-2 font-medium">{selectedApplication.email}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Phone:</span>
                    <span className="ml-2 font-medium">{selectedApplication.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Application Date:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedApplication.submitted_at)}</span>
                  </div>
                </div>
              </div>

              {/* Program Info */}
              <div>
                <h3 className="text-lg font-medium text-secondary mb-3">Program Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-secondary">Program:</span>
                    <span className="ml-2 font-medium">{selectedApplication.program}</span>
                  </div>
                  <div>
                    <span className="text-secondary">Intake:</span>
                    <span className="ml-2 font-medium">{selectedApplication.intake}</span>
                  </div>
                </div>
              </div>

              {/* Application Content */}
              <div>
                <h3 className="text-lg font-medium text-secondary mb-3">Application Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Personal Details</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Date of Birth:</strong> {selectedApplication.date_of_birth || 'Not provided'}</p>
                        <p><strong>Sex:</strong> {selectedApplication.sex || 'Not provided'}</p>
                        <p><strong>NRC:</strong> {selectedApplication.nrc_number || 'Not provided'}</p>
                        <p><strong>Passport:</strong> {selectedApplication.passport_number || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Contact Information</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Phone:</strong> {selectedApplication.phone || 'Not provided'}</p>
                        <p><strong>Email:</strong> {selectedApplication.email || 'Not provided'}</p>
                        <p><strong>Residence:</strong> {selectedApplication.residence_town || 'Not provided'}</p>
                        <p><strong>Guardian:</strong> {selectedApplication.guardian_name || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Payment Information</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Method:</strong> {selectedApplication.payment_method || 'Not provided'}</p>
                        <p><strong>Amount:</strong> K{selectedApplication.amount || selectedApplication.application_fee || 'Not provided'}</p>
                        <p><strong>Payer:</strong> {selectedApplication.payer_name || 'Not provided'}</p>
                        <p><strong>Status:</strong> {selectedApplication.payment_status || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-secondary">Documents</h4>
                      <div className="text-xs text-secondary mt-1 space-y-1">
                        <p><strong>Result Slip:</strong> {selectedApplication.result_slip_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                        <p><strong>Extra KYC:</strong> {selectedApplication.extra_kyc_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                        <p><strong>Proof of Payment:</strong> {selectedApplication.pop_url ? '✓ Uploaded' : '✗ Not uploaded'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetails(false)
                  setShowFeedbackModal(true)
                }}
              >
                Add Feedback
              </Button>
              {selectedApplication.status === 'submitted' && (
                <Button
                  loading={updating === selectedApplication.id}
                  onClick={() => {
                    updateApplicationStatus(selectedApplication.id, 'under_review')
                    setShowDetails(false)
                  }}
                >
                  Start Review
                </Button>
              )}
              {selectedApplication.status === 'under_review' && (
                <>
                  <Button
                    variant="outline"
                    loading={updating === selectedApplication.id}
                    onClick={() => {
                      updateApplicationStatus(selectedApplication.id, 'approved')
                      setShowDetails(false)
                    }}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    loading={updating === selectedApplication.id}
                    onClick={() => {
                      updateApplicationStatus(selectedApplication.id, 'rejected')
                      setShowDetails(false)
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-secondary">
                  Add Feedback - {selectedApplication.application_number}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowFeedbackModal(false)
                    setFeedbackText('')
                  }}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-secondary mb-2">
                  <strong>Applicant:</strong> {selectedApplication.full_name}
                </p>
                <p className="text-sm text-secondary mb-4">
                  <strong>Program:</strong> {selectedApplication.program}
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-secondary mb-2">
                  Feedback Message
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide feedback to the applicant about their application status, required documents, or next steps..."
                  rows={6}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-secondary mt-1">
                  This feedback will be visible to the applicant when they check their application status.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowFeedbackModal(false)
                  setFeedbackText('')
                }}
              >
                Cancel
              </Button>
              <Button
                loading={feedbackLoading}
                onClick={submitFeedback}
                disabled={!feedbackText.trim()}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}