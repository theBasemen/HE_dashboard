import { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children?: ReactNode
  requiredRole?: 'admin' | 'superadmin'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, userRole } = useAuth()
  const disableAuth = import.meta.env.VITE_DISABLE_AUTH === 'true'

  // Skip all auth checks if auth is disabled (dev mode)
  if (disableAuth) {
    return children ? <>{children}</> : <Outlet />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check role if required
  if (requiredRole) {
    if (!userRole) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-medium">Ingen adgang</p>
            <p className="text-gray-600 mt-2">Du har ikke de nødvendige rettigheder til at se denne side.</p>
          </div>
        </div>
      )
    }

    if (requiredRole === 'superadmin' && userRole !== 'superadmin') {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-medium">Ingen adgang</p>
            <p className="text-gray-600 mt-2">Denne side kræver superadmin rettigheder.</p>
          </div>
        </div>
      )
    }
  }

  // If children provided, render children (for nested ProtectedRoute)
  // Otherwise, render Outlet (for route layout)
  return children ? <>{children}</> : <Outlet />
}

