/**
 * Resolves the API base URL from environment variables with fallback
 */
export function getApiBaseUrl(): string {
  // Check for environment override first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  // Fallback to window.location.origin in browser
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // SSR fallback - should not happen in practice with Vite
  return 'http://localhost:3000'
}