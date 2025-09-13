import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'



createRoot(document.getElementById('root')!).render(
  <App />
)

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('SW registered'))
    .catch(() => console.log('SW registration failed'))
}