import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// PWA registration - using Vite PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      onNeedRefresh() {
        console.log('New content available, please refresh.')
      },
      onOfflineReady() {
        console.log('App ready to work offline')
      },
      onRegisterError(error) {
        console.log('SW registration error', error)
      }
    })
  }).catch(error => {
    console.log('PWA registration failed:', error)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)