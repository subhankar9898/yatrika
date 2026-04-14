import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { FiMenu, FiX, FiLogOut, FiBell, FiCheckCircle, FiEdit2 , FiGlobe, FiAlertTriangle, FiSearch, FiPieChart, FiCalendar} from 'react-icons/fi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import useAuthStore from '../../store/authStore'
import { authApi } from '../../api/auth'
import api from '../../api/axios'
import toast from 'react-hot-toast'

function EditProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    bio: '',
    languages: '',
    experience_years: 0,
  })
  const [guideLoaded, setGuideLoaded] = useState(false)

  // If guide, fetch guide profile for bio/languages/experience
  useEffect(() => {
    if (user?.role === 'guide') {
      api.get(`/guides/me?t=${Date.now()}`).then(r => {
        let langs = []
        if (Array.isArray(r.data.languages)) langs = r.data.languages
        else if (typeof r.data.languages === 'string') {
          try { langs = JSON.parse(r.data.languages) } catch(e) { langs = r.data.languages.split(',') }
        }
        
        setForm(f => ({
          ...f,
          bio: r.data.bio || '',
          languages: langs.join(', '),
          experience_years: r.data.experience_years || 0,
        }))
        setGuideLoaded(true)
      }).catch(() => setGuideLoaded(true))
    }
  }, [user?.role])

  const update = useMutation({
    mutationFn: () => {
      const data = { full_name: form.full_name, phone: form.phone }
      if (user?.role === 'guide') {
        data.bio = form.bio
        data.languages = form.languages.split(',').map(s => s.trim()).filter(Boolean)
        data.experience_years = parseInt(form.experience_years, 10) || 0
      }
      return authApi.updateProfile(data)
    },
    onSuccess: (res) => {
      toast.success('Profile updated!')
      if (onSaved && res.data?.user) onSaved(res.data.user)
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Update failed'),
  })

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-4 pt-16 sm:pt-20 pb-16">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-800">Edit My Profile</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><FiX size={20} /></button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input type="text" className="input text-sm" value={form.full_name}
                onChange={e => setForm({...form, full_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" className="input text-sm" value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="text" className="input text-sm bg-gray-50 cursor-not-allowed" value={user?.email || ''} disabled />
            </div>

            {user?.role === 'guide' && (
              <>
                <hr className="my-2" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guide Details</p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                  <textarea className="input text-sm h-20 resize-none" value={form.bio}
                    onChange={e => setForm({...form, bio: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Languages (comma separated)</label>
                  <input type="text" className="input text-sm" value={form.languages}
                    onChange={e => setForm({...form, languages: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Experience (years)</label>
                  <input type="number" min="0" className="input text-sm" value={form.experience_years}
                    onChange={e => setForm({...form, experience_years: e.target.value})} />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={onClose} className="flex-1 btn-secondary text-sm">Cancel</button>
            <button onClick={() => update.mutate()} disabled={update.isPending} className="flex-1 btn-primary text-sm disabled:opacity-50">
              {update.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

const TYPE_ICON = { booking: <FiCalendar />, success: <FiCheckCircle />, warning: <FiAlertTriangle />, info: 'ℹ️' }

function NotificationPanel({ onClose }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30000,
  })
  const markRead = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  })
  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  })
  const notifs = data?.notifications || []

  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-semibold text-gray-800 text-sm">Notifications</span>
        <div className="flex items-center gap-2">
          {data?.unread_count > 0 && (
            <button onClick={() => markAll.mutate()} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              <FiCheckCircle size={12} /> Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={16} /></button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {notifs.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            <FiBell size={28} className="mx-auto mb-2 opacity-40" />
            No notifications yet
          </div>
        ) : notifs.map(n => (
          <div
            key={n.id}
            className={`px-4 py-3 flex gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-brand-50' : ''}`}
            onClick={() => { if (!n.is_read) markRead.mutate(n.id); if (n.link) window.location.href = n.link }}
          >
            <span className="text-lg flex-shrink-0">{TYPE_ICON[n.type] || 'ℹ️'}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm text-gray-800 ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const bellRef = useRef(null)
  const { user, accessToken, clearAuth, setAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    enabled: !!accessToken,
    refetchInterval: 30000,
  })
  const unreadCount = notifData?.unread_count || 0

  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    clearAuth()
    queryClient.clear()
    toast.success('Logged out successfully')
    navigate('/')
  }

  const handleProfileSaved = (updatedUser) => {
    setAuth(updatedUser, accessToken)
  }

  const dashboardPath =
    user?.role === 'admin' ? '/admin' :
    user?.role === 'guide' ? '/guide/dashboard' : '/user/dashboard'

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group animate-fade-in">
            <img src="/logo.png" alt="Yatrika Logo" className="h-8 w-auto group-hover:scale-105 transition-transform duration-300" />
            <span className="text-xl font-bold text-brand-600 group-hover:text-brand-700 transition-colors">Yatrika</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-5">
            {accessToken && (
              <Link to="/places" className={`text-sm font-medium transition-colors hover:text-brand-600 ${isActive('/places') ? 'text-brand-600' : 'text-gray-600'}`}>
                Explore Places
              </Link>
            )}
            {accessToken ? (
              <div className="flex items-center gap-3">
                <Link to={dashboardPath} className={`text-sm font-medium transition-colors hover:text-brand-600 ${isActive(dashboardPath) ? 'text-brand-600' : 'text-gray-600'}`}>
                  Dashboard
                </Link>

                {/* Bell */}
                <div className="relative" ref={bellRef}>
                  <button onClick={() => setBellOpen(v => !v)} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Notifications">
                    <FiBell size={18} className="text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {bellOpen && <NotificationPanel onClose={() => setBellOpen(false)} />}
                </div>

                {/* User chip — clickable to edit profile */}
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 hover:border-brand-400 hover:bg-brand-50/40 transition-all cursor-pointer group"
                  title="Edit my profile"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold">
                    {user?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.full_name?.split(' ')[0]}</span>
                  <span className={`badge text-xs ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : user?.role === 'guide' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {user?.role}
                  </span>
                  <FiEdit2 size={12} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                </button>

                <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors">
                  <FiLogOut size={16} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn-secondary text-sm py-2 px-4">Log In</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">Sign Up</Link>
              </div>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 space-y-1">
          {accessToken && <Link to="/places" className="block py-2.5 text-gray-600 text-sm" onClick={() => setMenuOpen(false)}><FiSearch /> Explore Places</Link>}
          {accessToken ? (
            <>
              <Link to={dashboardPath} className="block py-2.5 text-gray-600 text-sm" onClick={() => setMenuOpen(false)}><FiPieChart /> Dashboard</Link>
              <button onClick={() => { setMenuOpen(false); setProfileOpen(true) }}
                className="block w-full text-left py-2.5 text-gray-600 text-sm">
                ✏️ Edit Profile
              </button>
              {unreadCount > 0 && <div className="py-2 text-sm text-brand-600 font-medium"><FiBell /> {unreadCount} new notification{unreadCount > 1 ? 's' : ''}</div>}
              <hr className="my-1 border-gray-100" />
              <button onClick={handleLogout} className="block w-full text-left py-2.5 text-red-500 text-sm"><FiLogOut /> Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2.5 text-gray-600 text-sm" onClick={() => setMenuOpen(false)}>Log In</Link>
              <Link to="/register" className="block py-2.5 text-brand-600 font-semibold text-sm" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
      {profileOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}
    </nav>
  )
}
