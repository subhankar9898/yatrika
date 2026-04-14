import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

// GitHub redirects here with ?token=...&role=...
// We store the token in memory and redirect to the right dashboard
export default function GitHubSuccessPage() {
  const [params] = useSearchParams()
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    const role = params.get('role')
    if (!token) { navigate('/login'); return }

    // Decode user from token (base64 payload)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const user = { id: parseInt(payload.sub), email: payload.email, role: payload.role, full_name: payload.email }
      setAuth(user, token)
      const redirect = role === 'admin' ? '/admin' : role === 'guide' ? '/guide/dashboard' : '/'
      navigate(redirect, { replace: true })
    } catch {
      navigate('/login')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Signing you in with GitHub...</p>
      </div>
    </div>
  )
}
