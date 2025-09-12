import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

const getCurrentYear = (() => {
  let cachedYear = new Date().getFullYear()
  let lastCheck = Date.now()
  return () => {
    const now = Date.now()
    if (now - lastCheck > 86400000) { // Check once per day
      cachedYear = new Date().getFullYear()
      lastCheck = now
    }
    return cachedYear
  }
})()

export function generateApplicationNumber() {
  const year = getCurrentYear()
  if (crypto?.randomUUID) {
    const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()
    return `MIHAS-${year}-${uuid}`
  }
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `MIHAS-${year}-${random}`
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'under_review':
      return 'bg-primary/10 text-primary'
    case 'approved':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    case 'withdrawn':
      return 'bg-gray-100 text-secondary'
    default:
      return 'bg-gray-100 text-secondary'
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}