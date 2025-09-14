import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Button } from './Button'

export function OfflineIndicator() {
  const { isOnline, offlineDataCount, isSyncing, syncNow } = useOfflineSync()

  return (
    <AnimatePresence>
      {(!isOnline || offlineDataCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <div className={`rounded-lg shadow-lg p-4 ${
            isOnline ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {isOnline ? (
                  <motion.div
                    animate={{ rotate: isSyncing ? 360 : 0 }}
                    transition={{ duration: 1, repeat: isSyncing ? Infinity : 0 }}
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-5 w-5 text-blue-600" />
                    ) : offlineDataCount > 0 ? (
                      <Cloud className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Wifi className="h-5 w-5 text-green-600" />
                    )}
                  </motion.div>
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isOnline ? 'text-blue-900' : 'text-red-900'
                }`}>
                  {isOnline ? (
                    isSyncing ? 'Syncing data...' : 
                    offlineDataCount > 0 ? `${offlineDataCount} items to sync` : 'Connected'
                  ) : (
                    'Working offline'
                  )}
                </p>
                <p className={`text-xs ${
                  isOnline ? 'text-blue-700' : 'text-red-700'
                }`}>
                  {isOnline ? (
                    offlineDataCount > 0 ? 'Data will sync automatically' : 'All data synced'
                  ) : (
                    'Changes saved locally'
                  )}
                </p>
              </div>

              {isOnline && offlineDataCount > 0 && !isSyncing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={syncNow}
                  className="text-xs"
                >
                  Sync Now
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}