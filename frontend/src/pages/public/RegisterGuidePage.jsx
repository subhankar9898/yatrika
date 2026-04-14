import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiPhone, FiBook , FiCompass} from 'react-icons/fi'
import { authApi } from '../../api/auth'
import toast from 'react-hot-toast'

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Kannada', 'Malayalam', 'Gujarati', 'Punjabi', 'Odia']

export default function RegisterGuidePage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', bio: '', experience_years: 0 })
  const [selectedLangs, setSelectedLangs] = useState(['English'])
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const toggleLang = (lang) => setSelectedLangs(prev =>
    prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedLangs.length === 0) { toast.error('Select at least one language'); return }
    setLoading(true)
    try {
      await authApi.registerGuide({ ...form, languages: selectedLangs })
      toast.success('Registration submitted! Admin will review your application.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-green-50 to-white">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Yatrika Logo" className="h-20 w-auto mx-auto" />
            <h1 className="text-2xl font-bold text-gray-800 mt-3">Become a Guide</h1>
            <p className="text-gray-500 text-sm mt-1">Register as a local guide on Yatrika</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
            <strong>Note:</strong> After registration, your account will be reviewed by admin. You will receive an email once approved.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic fields */}
            {[
              { id: 'full_name', label: 'Full Name', type: 'text', icon: <FiUser size={16} />, placeholder: 'Rajesh Sharma', required: true },
              { id: 'email', label: 'Email', type: 'email', icon: <FiMail size={16} />, placeholder: 'rajesh@example.com', required: true },
              { id: 'phone', label: 'Phone', type: 'tel', icon: <FiPhone size={16} />, placeholder: '+91 9876543210' },
            ].map(f => (
              <div key={f.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{f.icon}</span>
                  <input type={f.type} className="input pl-9" placeholder={f.placeholder}
                    value={form[f.id]} onChange={e => setForm({ ...form, [f.id]: e.target.value })}
                    required={f.required} />
                </div>
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type={showPass ? 'text' : 'password'} className="input pl-9 pr-10"
                  placeholder="Min. 8 characters" required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPass(!showPass)}>
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Years of Experience</label>
              <input type="number" min={0} max={50} className="input" value={form.experience_years}
                onChange={e => setForm({ ...form, experience_years: parseInt(e.target.value) })} />
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Languages Spoken</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(l => (
                  <button key={l} type="button"
                    onClick={() => toggleLang(l)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selectedLangs.includes(l)
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
                    }`}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio (optional)</label>
              <div className="relative">
                <FiBook className="absolute left-3 top-3 text-gray-400" size={16} />
                <textarea className="input pl-9 resize-none" rows={3} placeholder="Tell travellers about yourself..."
                  value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already approved?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
