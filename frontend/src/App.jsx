import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { HelmetProvider } from 'react-helmet-async'
import useAuthStore from './store/authStore'
import api from './api/axios'

import PublicLayout from './components/layout/PublicLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import PageLoader from './components/ui/PageLoader'
import AnimatedBackground from './components/ui/AnimatedBackground'
import AnimatedPage from './components/ui/AnimatedPage'

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
// Public
const HomePage = lazy(() => import('./pages/public/HomePage'))
const LoginPage = lazy(() => import('./pages/public/LoginPage'))
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'))
const RegisterGuidePage = lazy(() => import('./pages/public/RegisterGuidePage'))
const GitHubSuccessPage = lazy(() => import('./pages/public/GitHubSuccessPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const PlacesPage = lazy(() => import('./pages/public/PlacesPage'))
const PlaceDetailPage = lazy(() => import('./pages/public/PlaceDetailPage'))
const GuideProfilePage = lazy(() => import('./pages/public/GuideProfilePage'))

// Dashboards
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'))
const GuideDashboard = lazy(() => import('./pages/guide/GuideDashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminGuides = lazy(() => import('./pages/admin/AdminGuides'))
const AdminPlaces = lazy(() => import('./pages/admin/AdminPlaces'))
const AdminApprovals = lazy(() => import('./pages/admin/AdminApprovals'))

// ── Auth bootstrap ─────────────────────────────────────────────────────────────
function AuthInit() {
    const { setAuth, clearAuth } = useAuthStore()
    useEffect(() => {
        const init = async () => {
            try {
                const { data } = await api.post('/auth/refresh')
                const userRes = await api.get('/auth/me', {
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
    const location = useLocation()

    return (
        <HelmetProvider>
            <AuthInit />
            <AnimatedBackground />
            <Suspense fallback={<PageLoader />}>
                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route path="/auth/github/success" element={<GitHubSuccessPage />} />

                        <Route element={<PublicLayout />}>
                            {/* Landing */}
                            <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />

                            {/* Auth */}
                            <Route path="/login" element={<AnimatedPage><LoginPage /></AnimatedPage>} />
                            <Route path="/register" element={<AnimatedPage><RegisterPage /></AnimatedPage>} />
                            <Route path="/forgot-password" element={<AnimatedPage><ForgotPasswordPage /></AnimatedPage>} />
                            <Route path="/register/guide" element={<AnimatedPage><RegisterGuidePage /></AnimatedPage>} />

                            {/* Login-required public */}
                            <Route path="/places" element={<AuthRequired><AnimatedPage><PlacesPage /></AnimatedPage></AuthRequired>} />
                            <Route path="/places/:id" element={<AuthRequired><AnimatedPage><PlaceDetailPage /></AnimatedPage></AuthRequired>} />
                            <Route path="/guides/:id" element={<AuthRequired><AnimatedPage><GuideProfilePage /></AnimatedPage></AuthRequired>} />
                        </Route>

                        {/* User */}
                        <Route path="/user/dashboard" element={
                            <ProtectedRoute role="user"><AnimatedPage><UserDashboard /></AnimatedPage></ProtectedRoute>
                        } />

                        {/* Guide */}
                        <Route path="/guide/dashboard" element={
                            <ProtectedRoute role="guide"><AnimatedPage><GuideDashboard /></AnimatedPage></ProtectedRoute>
                        } />

                        {/* Admin */}
                        <Route path="/admin" element={<ProtectedRoute role="admin"><AnimatedPage><AdminDashboard /></AnimatedPage></ProtectedRoute>} />
                        <Route path="/admin/users" element={<ProtectedRoute role="admin"><AnimatedPage><AdminUsers /></AnimatedPage></ProtectedRoute>} />
                        <Route path="/admin/guides" element={<ProtectedRoute role="admin"><AnimatedPage><AdminGuides /></AnimatedPage></ProtectedRoute>} />
                        <Route path="/admin/places" element={<ProtectedRoute role="admin"><AnimatedPage><AdminPlaces /></AnimatedPage></ProtectedRoute>} />
                        <Route path="/admin/approvals" element={<ProtectedRoute role="admin"><AnimatedPage><AdminApprovals /></AnimatedPage></ProtectedRoute>} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </AnimatePresence>
            </Suspense>
        </HelmetProvider>
    )
}
