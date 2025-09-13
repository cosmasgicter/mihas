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
    open: (custom: number) => {
      return {
        x: 0,
        opacity: 1,
        transition: {
          delay: custom * 0.1
        }
      }
    }
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
          <span className="text-xl font-bold text-high-contrast">MIHAS-KATC</span>
        </motion.div>

        {/* Desktop Navigation */}
        <NavigationMenu.List className="hidden md:flex space-x-4">
          <NavigationMenu.Item>
            <Link to="/track-application">
              <Button 
                variant="gradient" 
                size="md" 
                magnetic
                className="bg-gradient-to-r from-white/30 to-white/40 border-2 border-white/70 text-white hover:from-white hover:to-white hover:text-primary font-bold backdrop-blur-sm shadow-lg"
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
                    className="bg-gradient-to-r from-white/30 to-white/40 border-2 border-white/70 text-white hover:from-white hover:to-white hover:text-primary font-bold backdrop-blur-sm shadow-lg"
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
          className="md:hidden p-3 rounded-xl text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-3 focus:ring-primary/60 shadow-lg hover:shadow-xl border border-white/30 hover:border-white/50 min-h-[48px] min-w-[48px]"
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
              className="fixed inset-0 mobile-menu-backdrop z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />

            {/* Mobile Menu */}
            <motion.div
              className="fixed top-0 right-0 h-full w-80 max-w-[90vw] mobile-nav-bg mobile-nav-shadow z-50 md:hidden"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/30">
                  <div className="flex items-center space-x-3">
                    <GraduationCap className="h-7 w-7 text-primary" />
                    <span className="text-xl font-bold text-high-contrast">MIHAS-KATC</span>
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
                <NavigationMenu.List className="flex flex-col space-y-3 p-6 flex-1">
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
                        className="mobile-nav-item mobile-nav-focus nav-item text-high-contrast hover:bg-white/20 shadow-sm hover:shadow-md border border-white/10 hover:border-white/30"
                      >
                        <span className="mobile-nav-text">Track Application</span>
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
                          className="mobile-nav-item mobile-nav-focus nav-item bg-primary/30 text-high-contrast hover:bg-primary/40 font-bold shadow-md hover:shadow-lg border-2 border-primary/50 hover:border-primary/70"
                        >
                          <LayoutDashboard className="w-5 h-5 mr-3" />
                          <span className="mobile-nav-text">Dashboard</span>
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
                            className="mobile-nav-item mobile-nav-focus nav-item text-high-contrast hover:bg-white/20 shadow-sm hover:shadow-md border border-white/10 hover:border-white/30"
                          >
                            <span className="mobile-nav-text">Sign In</span>
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
                            className="mobile-nav-item mobile-nav-focus nav-item bg-primary/30 text-high-contrast hover:bg-primary/40 font-bold shadow-md hover:shadow-lg border-2 border-primary/50 hover:border-primary/70"
                          >
                            <span className="mobile-nav-text">Apply Now</span>
                          </Link>
                        </motion.div>
                      </NavigationMenu.Item>
                    </>
                  )}
                </NavigationMenu.List>

                {/* Footer */}
                <div className="p-6 border-t border-white/30">
                  <p className="text-white/90 text-base text-center font-medium drop-shadow-sm">
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