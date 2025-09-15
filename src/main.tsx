import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyClientSecurityHeaders } from './lib/securityHeaders'

// Apply security headers immediately
applyClientSecurityHeaders()

// Render immediately for better LCP
createRoot(document.getElementById('root')!).render(
  <App />
)

// Defer non-critical initialization
setTimeout(() => {
  import('./services/offlineSync').then(({ offlineSyncService }) => {
    offlineSyncService.init().catch(console.error)
  })
}, 100)