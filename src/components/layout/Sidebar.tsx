import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  User, 
  Settings, 
  LogOut,
  ChevronDown,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  BarChart3
} from 'lucide-react'

const Sidebar: React.FC = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  
  const isActive = (path: string) => location.pathname === path
  const isAdminUser = user && ['admin', 'registrar', 'academic_staff'].includes(user.role)
  
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }
  
  const mainMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/applications', icon: FileText, label: 'Applications' },
    { path: '/profile', icon: User, label: 'Profile' }
  ]
  
  const adminMenuItems = [
    { path: '/admin', icon: BarChart3, label: 'Admin Dashboard' },
    { path: '/admin/applications', icon: FileText, label: 'Manage Applications' },
    { path: '/admin/students', icon: Users, label: 'Student Management' },
    { path: '/admin/programs', icon: BookOpen, label: 'Academic Programs' },
    { path: '/admin/exams', icon: GraduationCap, label: 'Examinations' },
    { path: '/admin/schedule', icon: Calendar, label: 'Schedule' }
  ]

  return (
    <div className="fixed top-16 left-0 h-full w-64 bg-white shadow-lg border-r border-gray-200 z-40">
      <div className="flex flex-col h-full">
        {/* User Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {/* Main Menu */}
          {mainMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            )
          })}
          
          {/* Admin Menu */}
          {isAdminUser && (
            <div className="pt-4 border-t border-gray-200">
              <div className="px-3 pb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </p>
              </div>
              
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <Settings className="w-5 h-5 mr-3" />
                  Admin Panel
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${
                  adminMenuOpen ? 'rotate-180' : ''
                }`} />
              </button>
              
              {adminMenuOpen && (
                <div className="ml-6 mt-2 space-y-1">
                  {adminMenuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive(item.path)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
        
        {/* Sign Out */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar