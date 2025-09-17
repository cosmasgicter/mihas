import React, { useEffect, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminRoute } from '@/components/AdminRoute'
import { ToastProvider } from '@/components/ui/Toast'
import { LoadingFallback } from '@/components/ui/LoadingFallback'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { initializeSecurity } from '@/lib/securityConfig'
import { routes, type RouteConfig } from '@/routes/config'


// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

const renderRoute = (route: RouteConfig) => {
  const { element, guard, lazy } = route
  
  let routeElement: React.ReactElement
  
  if (React.isValidElement(element)) {
    routeElement = element
  } else {
    const Component = element as React.ComponentType
    routeElement = lazy ? (
      <Suspense fallback={<LoadingFallback />}>
        <Component />
      </Suspense>
    ) : <Component />
  }
  
  switch (guard) {
    case 'auth':
      return <ProtectedRoute>{routeElement}</ProtectedRoute>
    case 'admin':
      return <AdminRoute>{routeElement}</AdminRoute>
    default:
      return routeElement
  }
}

function App() {
  useEffect(() => {
    initializeSecurity()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 relative overflow-hidden">
              <div className="relative z-10">
                <Routes>
                  {routes.map((route) => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={renderRoute(route)}
                    />
                  ))}
                </Routes>
                <OfflineIndicator />
              </div>
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App