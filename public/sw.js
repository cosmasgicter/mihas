const CACHE_NAME = 'mihas-v1'
const OFFLINE_URL = '/offline.html'

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
]

const API_CACHE_NAME = 'mihas-api-v1'
const IMAGE_CACHE_NAME = 'mihas-images-v1'

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Handle API requests
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return fetch(request).then((response) => {
          // Only cache successful GET requests
          if (request.method === 'GET' && response.status === 200) {
            cache.put(request, response.clone())
          }
          return response
        }).catch(() => {
          // Return cached version if available
          return cache.match(request)
        })
      })
    )
    return
  }

  // Handle image requests
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response
          }
          return fetch(request).then((response) => {
            if (response.status === 200) {
              cache.put(request, response.clone())
            }
            return response
          })
        })
      })
    )
    return
  }

  // Handle other requests
  event.respondWith(
    caches.match(request)
      .then((response) => {
        return response || fetch(request)
      })
  )
})

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData())
  }
})

async function syncOfflineData() {
  try {
    // This would integrate with your offline sync service
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      // Verify client origin before sending message
      if (client.url && new URL(client.url).origin === self.location.origin) {
        client.postMessage({ type: 'SYNC_OFFLINE_DATA' })
      }
    })
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: data.data
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const targetUrl = event.notification.data?.url || '/'
  
  // Strict origin verification for CWE-346 compliance
  if (typeof targetUrl !== 'string') {
    event.waitUntil(self.clients.openWindow('/'))
    return
  }
  
  try {
    const url = new URL(targetUrl, self.location.origin)
    
    // Only allow same-origin URLs with matching protocol and host
    if (url.origin === self.location.origin && 
        url.protocol === self.location.protocol &&
        url.hostname === self.location.hostname) {
      event.waitUntil(self.clients.openWindow(url.href))
    } else {
      event.waitUntil(self.clients.openWindow('/'))
    }
  } catch (error) {
    event.waitUntil(self.clients.openWindow('/'))
  }
})