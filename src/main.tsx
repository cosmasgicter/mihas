import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Render immediately for better LCP
createRoot(document.getElementById('root')!).render(
  <App />
)

// Defer non-critical initialization
setTimeout(() => {
  import('./services/offlineSync').then(({ offlineSyncService }) => {
    offlineSyncService.init().catch(console.error)
  })
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW registration failed'))
  }
}, 100)