import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { Button } from './Button'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { 
  User, 
  LogOut, 
  Bell, 
  Settings, 
  Menu, 
  X, 
  Home,
  FileText,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthenticatedNavigationProps {
  className?: string
}

export function AuthenticatedNavigation({ className }: AuthenticatedNavigationProps) {
  const { user, profile, signOut } = useAuth()
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
  ]

  return (
    <NavigationMenu.Root className={cn("bg-white shadow", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* User Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  Welcome, {profile?.full_name || 'Student'}
                </h1>
                <p className="text-sm text-gray-600">{profile?.email}</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <NavigationMenu.List className="hidden md:flex items-center space-x-4">
            {navigationItems.map((item) => (
              <NavigationMenu.Item key={item.href}>
                <Link to={item.href}>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              </NavigationMenu.Item>
            ))}
            
            <NavigationMenu.Item>
              <Button variant="ghost" size="sm" className="hidden lg:flex">
                <Bell className="h-4 w-4" />
              </Button>
            </NavigationMenu.Item>
            
            <NavigationMenu.Item>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </NavigationMenu.Item>
          </NavigationMenu.List>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />

            {/* Mobile Menu */}
            <motion.div
              className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl z-50 md:hidden"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{profile?.full_name || 'Student'}</p>
                      <p className="text-sm text-gray-600">{profile?.email}</p>
                    </div>
                  </div>
                  <motion.button
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onClick={closeMenu}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>

                {/* Navigation Items */}
                <NavigationMenu.List className="flex flex-col space-y-2 p-6 flex-1">
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
                          className="flex items-center w-full p-4 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium"
                        >
                          <item.icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </Link>
                      </motion.div>
                    </NavigationMenu.Item>
                  ))}

                  <NavigationMenu.Item>
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
                        className="flex items-center w-full p-4 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-medium"
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                      </button>
                    </motion.div>
                  </NavigationMenu.Item>
                </NavigationMenu.List>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                  <p className="text-gray-500 text-sm text-center">
                    MIHAS-KATC Student Portal
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </NavigationMenu.Root>
  )
}