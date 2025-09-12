import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as NavigationMenu from '@radix-ui/react-navigation-menu'
import { Button } from './Button'
import { GraduationCap, Menu, X, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface MobileNavigationProps {
  className?: string
}

export function MobileNavigation({ className }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const menuVariants = {
    closed: {
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40
      }
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    closed: {
      x: 50,
      opacity: 0
    },
    open: (custom: number) => ({
      x: 0,
      opacity: 1,
      transition: {
        delay: custom * 0.1
      }
    })
  }

  return (
    <NavigationMenu.Root className={cn("relative", className)}>
      <div className="flex justify-between items-center py-4">
        {/* Logo */}
        <motion.div
          className="flex items-center space-x-2"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "linear",
              repeatType: "loop"
            }}
            style={{ willChange: 'transform' }}
          >
            <GraduationCap className="h-8 w-8 text-primary" />
          </motion.div>
          <span className="text-xl font-bold gradient-text">MIHAS-KATC</span>
        </motion.div>

        {/* Desktop Navigation */}
        <NavigationMenu.List className="hidden md:flex space-x-4">
          <NavigationMenu.Item>
            <Link to="/track-application">
              <Button 
                variant="outline" 
                size="md" 
                className="text-white border-2 border-white/50 hover:bg-white hover:text-primary font-semibold backdrop-blur-sm bg-white/10 transition-all duration-300 hover:scale-105"
              >
                Track Application
              </Button>
            </Link>
          </NavigationMenu.Item>
          {user ? (
            <NavigationMenu.Item>
              <Link to="/dashboard">
                <Button 
                  variant="gradient" 
                  size="md" 
                  magnetic 
                  glow 
                  className="font-semibold"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </NavigationMenu.Item>
          ) : (
            <>
              <NavigationMenu.Item>
                <Link to="/auth/signin">
                  <Button 
                    variant="gradient" 
                    size="md" 
                    magnetic 
                    className="bg-gradient-to-r from-white/20 to-white/30 border border-white/50 text-white hover:from-white hover:to-white hover:text-primary font-semibold backdrop-blur-sm"
                  >
                    Sign In
                  </Button>
                </Link>
              </NavigationMenu.Item>
              <NavigationMenu.Item>
                <Link to="/auth/signup">
                  <Button variant="gradient" size="md" magnetic glow className="font-semibold">
                    Apply Now
                  </Button>
                </Link>
              </NavigationMenu.Item>
            </>
          )}
        </NavigationMenu.List>

        {/* Mobile Menu Button */}
        <motion.button
          className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
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
              className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl z-50 md:hidden"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/20">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-6 w-6 text-white" />
                    <span className="text-lg font-bold text-white">MIHAS-KATC</span>
                  </div>
                  <motion.button
                    className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    onClick={closeMenu}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>

                {/* Navigation Items */}
                <NavigationMenu.List className="flex flex-col space-y-2 p-6 flex-1">
                  <NavigationMenu.Item>
                    <motion.div
                      variants={itemVariants}
                      custom={0}
                      initial="closed"
                      animate="open"
                    >
                      <Link 
                        to="/track-application"
                        onClick={closeMenu}
                        className="flex items-center w-full p-4 rounded-lg text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
                      >
                        Track Application
                      </Link>
                    </motion.div>
                  </NavigationMenu.Item>

                  {user ? (
                    <NavigationMenu.Item>
                      <motion.div
                        variants={itemVariants}
                        custom={1}
                        initial="closed"
                        animate="open"
                      >
                        <Link 
                          to="/dashboard"
                          onClick={closeMenu}
                          className="flex items-center w-full p-4 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-semibold border border-white/30"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </Link>
                      </motion.div>
                    </NavigationMenu.Item>
                  ) : (
                    <>
                      <NavigationMenu.Item>
                        <motion.div
                          variants={itemVariants}
                          custom={1}
                          initial="closed"
                          animate="open"
                        >
                          <Link 
                            to="/auth/signin"
                            onClick={closeMenu}
                            className="flex items-center w-full p-4 rounded-lg text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium"
                          >
                            Sign In
                          </Link>
                        </motion.div>
                      </NavigationMenu.Item>

                      <NavigationMenu.Item>
                        <motion.div
                          variants={itemVariants}
                          custom={2}
                          initial="closed"
                          animate="open"
                        >
                          <Link 
                            to="/auth/signup"
                            onClick={closeMenu}
                            className="flex items-center w-full p-4 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 font-semibold border border-white/30"
                          >
                            Apply Now
                          </Link>
                        </motion.div>
                      </NavigationMenu.Item>
                    </>
                  )}
                </NavigationMenu.List>

                {/* Footer */}
                <div className="p-6 border-t border-white/20">
                  <p className="text-white/70 text-sm text-center">
                    Your Future Starts Here
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