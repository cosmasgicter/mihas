import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { Button } from './Button'
import { useAuth } from '@/contexts/AuthContext'
import { useProfileQuery } from '@/hooks/auth/useProfileQuery'
import { useIsMobile } from '@/hooks/use-mobile'
import { NotificationBell } from '@/components/student/NotificationBell'
import {
  User,
  LogOut,
  Settings,
  Menu,
  X,
  Home,
  Plus,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthenticatedNavigationProps {
  className?: string
}

export function AuthenticatedNavigation({ className }: AuthenticatedNavigationProps) {
  const { signOut } = useAuth()
  const { profile } = useProfileQuery()
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Sign out failed:', error)
      // Fallback: navigate anyway to prevent user being stuck
      navigate('/')
    }
  }

  const menuVariants = useMemo(() => ({
    closed: {
      opacity: 0,
      x: '100%',
      transition: {
        duration: 0.3,
        ease: [0.25, 0.25, 0, 1]
      }
    },
    open: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.25, 0, 1]
      }
    }
  }), [])

  const itemVariants = useMemo(() => ({
    closed: { opacity: 0, x: 20 },
    open: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3
      }
    })
  }), [])

  const navigationItems = [
    { href: '/student/dashboard', label: 'Dashboard', icon: Home },
    { href: '/apply', label: 'New Application', icon: Plus },
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/student/notifications', label: 'Notifications', icon: Bell }
  ]

  return (
    <NavigationMenu.Root className={cn("bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200/50 sticky top-0 z-40", className)}>
      <div className="container-mobile">
        <div className="flex justify-between items-center py-3 sm:py-4">
          {/* User Info - Mobile First */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <motion.div 
              className="flex items-center space-x-2 sm:space-x-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-lg font-bold text-gray-900">
                  {isMobile ? (profile?.full_name?.split(' ')[0] || 'Student') : `Welcome, ${profile?.full_name || 'Student'}`}
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">{profile?.email}</p>
                <p className="text-xs text-gray-600 sm:hidden truncate max-w-[120px]">{profile?.email}</p>
              </div>
            </motion.div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="lg:hidden">
              <NotificationBell />
            </div>

            {/* Desktop Navigation */}
            <NavigationMenu.List className="hidden lg:flex items-center space-x-2">
              {navigationItems.map((item) => (
                <NavigationMenu.Item key={item.href}>
                  <Link to={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-2 hover:bg-primary/10 hover:text-primary transition-all duration-200"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </Button>
                  </Link>
                </NavigationMenu.Item>
              ))}

              <NavigationMenu.Item>
                <NotificationBell />
              </NavigationMenu.Item>

              <NavigationMenu.Item>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="ml-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </NavigationMenu.Item>
            </NavigationMenu.List>

            {/* Mobile Menu Button */}
            <motion.button
              className="lg:hidden p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 touch-target"
              onClick={toggleMenu}
              whileTap={{ scale: 0.95 }}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="h-6 w-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />

            {/* Mobile Menu */}
            <motion.div
              className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white/95 backdrop-blur-xl shadow-2xl z-50 lg:hidden safe-area-top safe-area-bottom border-l border-gray-200/50"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200/70 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{profile?.full_name || 'Student'}</p>
                      <p className="text-sm text-gray-600 truncate max-w-[180px]">{profile?.email}</p>
                    </div>
                  </div>
                  <motion.button
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 touch-target"
                    onClick={closeMenu}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Close menu"
                  >
                    <X className="h-6 w-6" />
                  </motion.button>
                </div>

                {/* Navigation Items */}
                <NavigationMenu.List className="flex flex-col space-y-3 p-6 flex-1 custom-scrollbar overflow-y-auto">
                  {navigationItems.map((item, index) => (
                    <NavigationMenu.Item key={item.href}>
                      <motion.div
                        variants={itemVariants}
                        custom={index}
                        initial="closed"
                        animate="open"
                      >
                        <Link 
                          to={item.href}
                          onClick={closeMenu}
                          className="mobile-nav-item mobile-nav-focus text-gray-700 hover:bg-primary/10 hover:text-primary border border-gray-200 hover:border-primary/30 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-3">
                              <item.icon className="h-5 w-5" />
                              <span className="mobile-nav-text">{item.label}</span>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    </NavigationMenu.Item>
                  ))}

                  {/* Sign Out */}
                  <NavigationMenu.Item className="mt-4">
                    <motion.div
                      variants={itemVariants}
                      custom={navigationItems.length}
                      initial="closed"
                      animate="open"
                    >
                      <button 
                        onClick={() => {
                          closeMenu()
                          handleSignOut()
                        }}
                        className="mobile-nav-item mobile-nav-focus w-full bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl border-2 border-red-400 hover:border-red-500"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <LogOut className="h-5 w-5" />
                            <span className="mobile-nav-text">Sign Out</span>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  </NavigationMenu.Item>
                </NavigationMenu.List>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200/70 bg-gray-50/80 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      MIHAS-KATC Student Portal
                    </p>
                    <p className="text-xs text-gray-500">
                      Your Academic Journey Starts Here
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </NavigationMenu.Root>
  )
}