import { useState, useEffect } from 'react'
import { offlineSyncService } from '@/services/offlineSync'
import { useAuth } from '@/contexts/AuthContext'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineDataCount, setOfflineDataCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (user) {
        setIsSyncing(true)
        offlineSyncService.processOfflineData().finally(() => {
          setIsSyncing(false)
          updateOfflineDataCount()
        })
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user])

  const updateOfflineDataCount = async () => {
    if (user) {
      const count = await offlineSyncService.getOfflineDataCount(user.id)
      setOfflineDataCount(count)
    }
  }

  useEffect(() => {
    updateOfflineDataCount()
  }, [user])

  const storeOffline = async (type: 'application_draft' | 'document_upload' | 'form_submission', data: any) => {
    if (user) {
      await offlineSyncService.storeOffline(user.id, type, data)
      await updateOfflineDataCount()
    }
  }

  const syncNow = async () => {
    if (isOnline && user && !isSyncing) {
      setIsSyncing(true)
      try {
        await offlineSyncService.processOfflineData()
        await updateOfflineDataCount()
      } finally {
        setIsSyncing(false)
      }
    }
  }

  return {
    isOnline,
    offlineDataCount,
    isSyncing,
    storeOffline,
    syncNow
  }
}