import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import api from './api/axios'

import PublicLayout from './components/layout/PublicLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import PageLoader from './components/ui/PageLoader'

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
// Public
const HomePage           = lazy(() => import('./pages/public/HomePage'))
const LoginPage          = lazy(() => import('./pages/public/LoginPage'))
const RegisterPage       = lazy(() => import('./pages/public/RegisterPage'))
const RegisterGuidePage  = lazy(() => import('./pages/public/RegisterGuidePage'))
const GitHubSuccessPage  = lazy(() => import('./pages/public/GitHubSuccessPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const PlacesPage         = lazy(() => import('./pages/public/PlacesPage'))
const PlaceDetailPage    = lazy(() => import('./pages/public/PlaceDetailPage'))
const GuideProfilePage   = lazy(() => import('./pages/public/GuideProfilePage'))

// Dashboards
const UserDashboard  = lazy(() => import('./pages/user/UserDashboard'))
const GuideDashboard = lazy(() => import('./pages/guide/GuideDashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers     = lazy(() => import('./pages/admin/AdminUsers'))
const AdminGuides    = lazy(() => import('./pages/admin/AdminGuides'))
const AdminPlaces    = lazy(() => import('./pages/admin/AdminPlaces'))
const AdminApprovals = lazy(() => import('./pages/admin/AdminApprovals'))

// ── Auth bootstrap ─────────────────────────────────────────────────────────────
function AuthInit() {
  const { setAuth, clearAuth } = useAuthStore()
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.post('/auth/refresh')
        const userRes  = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
        setAuth(userRes.data, data.access_token)
      } catch {
        clearAuth()
      }
    }
    init()
  }, [])
  return null
}

function AuthRequired({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <AuthInit />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth/github/success" element={<GitHubSuccessPage />} />

          <Route element={<PublicLayout />}>
            {/* Landing */}
            <Route path="/" element={<HomePage />} />

            {/* Auth */}
            <Route path="/login"            element={<LoginPage />} />
            <Route path="/register"         element={<RegisterPage />} />
            <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
            <Route path="/register/guide"   element={<RegisterGuidePage />} />

            {/* Login-required public */}
            <Route path="/places"     element={<AuthRequired><PlacesPage /></AuthRequired>} />
            <Route path="/places/:id" element={<AuthRequired><PlaceDetailPage /></AuthRequired>} />
            <Route path="/guides/:id" element={<AuthRequired><GuideProfilePage /></AuthRequired>} />
          </Route>

          {/* User */}
          <Route path="/user/dashboard" element={
            <ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>
          } />

          {/* Guide */}
          <Route path="/guide/dashboard" element={
            <ProtectedRoute role="guide"><GuideDashboard /></ProtectedRoute>
          } />

          {/* Admin */}
          <Route path="/admin"           element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users"     element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/guides"    element={<ProtectedRoute role="admin"><AdminGuides /></ProtectedRoute>} />
          <Route path="/admin/places"    element={<ProtectedRoute role="admin"><AdminPlaces /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute role="admin"><AdminApprovals /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
