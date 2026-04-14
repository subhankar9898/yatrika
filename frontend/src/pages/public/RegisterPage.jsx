import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiGithub } from 'react-icons/fi'
import { authApi } from '../../api/auth'
import OTPModal from '../../components/ui/OTPModal'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await authApi.register(form)
      toast.success('OTP sent to your email!')
      setShowOTP(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerified = () => {
    setShowOTP(false)
    toast.success('Account created! Please log in.')
    navigate('/login')
  }

  const inputField = (id, label, type, icon, placeholder, extraProps = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          id={id}
          type={type}
          className="input pl-9"
          placeholder={placeholder}
          value={form[id]}
          onChange={e => setForm({ ...form, [id]: e.target.value })}
          {...extraProps}
        />
        {id === 'password' && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPass(!showPass)}
          >
            {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-brand-50 to-white">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="Yatrika Logo" className="h-20 w-auto mx-auto" />
            <h1 className="text-2xl font-bold text-gray-800 mt-3">Create your account</h1>
            <p className="text-gray-500 text-sm mt-1">Start exploring India with Yatrika</p>
          </div>

          <button
            onClick={() => authApi.githubLogin()}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-6"
          >
            <FiGithub size={18} />
            Sign up with GitHub
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white text-xs text-gray-400">or with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {inputField('full_name', 'Full Name', 'text', <FiUser size={16} />, 'Ravi Kumar', { required: true })}
            {inputField('email', 'Email', 'email', <FiMail size={16} />, 'ravi@example.com', { required: true })}
            {inputField('password', showPass ? 'text' : 'password', 'password', <FiLock size={16} />, 'Min. 8 characters', { required: true })}
            {inputField('phone', 'Phone (optional)', 'tel', <FiPhone size={16} />, '+91 9876543210')}

            <p className="text-xs text-gray-400">
              OTP verification is required. An OTP will be sent to your email.
            </p>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending OTP...
                </span>
              ) : 'Send OTP & Register'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      {showOTP && (
        <OTPModal
          email={form.email}
          purpose="signup"
          onVerified={handleVerified}
          onClose={() => setShowOTP(false)}
        />
      )}
    </div>
  )
}
