/**
 * Resolves the API base URL from environment variables with fallback
 */
export function getApiBaseUrl(): string {
  // Check for environment override first
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
    return import.meta.env.VITE_API_BASE_URL
  }

  // Fallback to window.location.origin in browser
  if (typeof window !== 'undefined') {
    console.log('Using window.location.origin:', window.location.origin)
    return window.location.origin
  }

  // SSR fallback - should not happen in practice with Vite
  console.log('Using SSR fallback')
  return 'https://application.mihas.edu.zm'
}