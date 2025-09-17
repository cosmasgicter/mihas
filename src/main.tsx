import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Security headers are handled by server configuration

// Render immediately for better LCP
createRoot(document.getElementById('root')!).render(
  <App />
)

// Defer non-critical initialization
setTimeout(() => {
  import('./services/offlineSync').then(({ offlineSyncService }) => {
    offlineSyncService.init().catch(() => {
      // Silently handle initialization errors
    })
  }).catch(() => {
    // Silently handle import errors
  })
}, 100)