import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, UserProfile } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AdminNavigation } from '@/components/ui/AdminNavigation'
import { ArrowLeft, Users, Shield, User } from 'lucide-react'
import { sanitizeForLog } from '@/lib/sanitize'

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('') // Clear previous errors
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data || [])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users. Please try again.'
      console.error('Failed to load users:', sanitizeForLog(errorMessage))
      setError(errorMessage)
      setUsers([]) // Reset users on error
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      setUpdating(userId)
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', userId)
      if (error) throw error
      await loadUsers()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user role'
      console.error('Failed to update user role:', sanitizeForLog(errorMessage))
      setError(errorMessage)
    } finally {
      setUpdating(null)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return <Shield className="h-4 w-4 text-red-500" />
      case 'admissions_officer':
      case 'registrar':
      case 'finance_officer':
      case 'academic_head':
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'bg-red-100 text-red-800'
      case 'admissions_officer':
      case 'registrar':
      case 'finance_officer':
      case 'academic_head':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <AdminNavigation />
      <div className="container-mobile py-4 sm:py-6 lg:py-8 safe-area-bottom">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header - Mobile First */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 border-white/30">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">👥 User Management</h1>
                  <p className="text-white/90 text-sm sm:text-base">Manage user roles and permissions</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold">{users.length}</div>
                <div className="text-sm text-white/80">Total Users</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-6 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">😱</div>
                  <div className="text-red-700 font-medium">{error}</div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-lg text-gray-600">Loading users...</p>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-8xl mb-6">👥</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Users Found</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  No users have been registered yet. Users will appear here once they sign up for the system.
                </p>
                <Button onClick={loadUsers} className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold">
                  Refresh Users
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="block lg:hidden space-y-4">
                  {users.map((user) => (
                    <div key={user.user_id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="flex-shrink-0">
                          {getRoleIcon(user.role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 truncate">
                            {user.full_name || 'No name provided'}
                          </h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {user.phone && (
                            <p className="text-sm text-gray-500">{user.phone}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            ID: {user.user_id.slice(0, 8)}...
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          getRoleColor(user.role)
                        }`}>
                          {user.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                        </div>
                        <div className="flex space-x-2">
                          {user.role === 'student' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={updating === user.user_id}
                              onClick={() => updateUserRole(user.user_id, 'admissions_officer')}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              Make Admin
                            </Button>
                          )}
                          {user.role !== 'student' && user.role !== 'super_admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={updating === user.user_id}
                              onClick={() => updateUserRole(user.user_id, 'student')}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              Make Student
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-purple-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          👤 User
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          📞 Contact
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          🏆 Role
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                          📅 Joined
                        </th>
                        <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">
                          ⚙️ Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.user_id} className="hover:bg-purple-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {getRoleIcon(user.role)}
                              <div className="ml-3">
                                <div className="text-sm font-semibold text-gray-900">
                                  {user.full_name || 'No name provided'}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  ID: {user.user_id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{user.email}</div>
                            {user.phone && (
                              <div className="text-sm text-gray-500">{user.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              getRoleColor(user.role)
                            }`}>
                              {user.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {user.role === 'student' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  loading={updating === user.user_id}
                                  onClick={() => updateUserRole(user.user_id, 'admissions_officer')}
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                  Make Admin
                                </Button>
                              )}
                              {user.role !== 'student' && user.role !== 'super_admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  loading={updating === user.user_id}
                                  onClick={() => updateUserRole(user.user_id, 'student')}
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                >
                                  Make Student
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}