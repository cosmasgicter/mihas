import { getSecureId } from './security'

interface OfflineData {
  id: string
  type: 'application_draft' | 'document_upload' | 'form_submission'
  data: any
  timestamp: number
  userId: string
}

class OfflineStorageManager {
  private dbName = 'mihas-offline-db'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version)
        
        request.onerror = () => {
          // Silently handle IndexedDB errors
          resolve()
        }
        request.onsuccess = () => {
          this.db = request.result
          resolve()
        }
      } catch (error) {
        // Silently handle any initialization errors
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create offline data store
        if (!db.objectStoreNames.contains('offlineData')) {
          const store = db.createObjectStore('offlineData', { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  async store(data: Omit<OfflineData, 'id' | 'timestamp'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')
    
    const id = `${data.type}_${Date.now()}_${getSecureId()}`
    const offlineData: OfflineData = {
      ...data,
      id,
      timestamp: Date.now()
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite')
      const store = transaction.objectStore('offlineData')
      const request = store.add(offlineData)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(id)
    })
  }

  async getAll(userId?: string): Promise<OfflineData[]> {
    if (!this.db) throw new Error('Database not initialized')
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly')
      const store = transaction.objectStore('offlineData')
      
      let request: IDBRequest
      if (userId) {
        const index = store.index('userId')
        request = index.getAll(userId)
      } else {
        request = store.getAll()
      }
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async remove(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite')
      const store = transaction.objectStore('offlineData')
      const request = store.delete(id)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(userId?: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')
    
    if (userId) {
      const data = await this.getAll(userId)
      for (const item of data) {
        await this.remove(item.id)
      }
    } else {
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(['offlineData'], 'readwrite')
        const store = transaction.objectStore('offlineData')
        const request = store.clear()
        
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    }
  }
}

export const offlineStorage = new OfflineStorageManager()