import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Render immediately for better performance
createRoot(document.getElementById('root')!).render(<App />)

// Defer non-critical services
if (typeof window !== 'undefined') {
  setTimeout(() => {
    import('./services/offlineSync').then(({ offlineSyncService }) => {
      offlineSyncService.init().catch(() => {})
    }).catch(() => {})
  }, 2000) // Increased delay to not interfere with initial load
}