import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function ProtectedRoute({ children, role }) {
  const { user, accessToken, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!accessToken) return <Navigate to="/login" replace />

  if (role && user?.role !== role) {
    const redirect = user?.role === 'admin' ? '/admin' : user?.role === 'guide' ? '/guide/dashboard' : '/'
    return <Navigate to={redirect} replace />
  }

  return children
}
