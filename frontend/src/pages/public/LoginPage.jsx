import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { FiMail, FiLock, FiEye, FiEyeOff, FiGithub, FiGlobe } from 'react-icons/fi'
import { authApi } from '../../api/auth'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import HumanCaptcha from '../../components/ui/HumanCaptcha'

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [captchaVerified, setCaptchaVerified] = useState(false)
    const { setAuth, user, accessToken } = useAuthStore()
    const navigate = useNavigate()

    // Redirect if already logged in
    useEffect(() => {
        if (user && accessToken) {
            const dest = user.role === 'admin' ? '/admin' : user.role === 'guide' ? '/guide/dashboard' : '/'
            navigate(dest, { replace: true })
        }
    }, [user, accessToken, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!captchaVerified) { toast.error('Please complete the human verification'); return }
        setLoading(true)
        try {
            const { data } = await authApi.login(form)
            setAuth(data.user, data.access_token)
            toast.success(`Welcome back, ${data.user.full_name.split(' ')[0]}!`)
            const redirect =
                data.user.role === 'admin' ? '/admin' :
                    data.user.role === 'guide' ? '/guide/dashboard' :
                        '/'
            navigate(redirect)
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gray-50">
            <Helmet>
                <title>Login — Yatrika</title>
                <meta name="description" content="Sign in to your Yatrika account." />
            </Helmet>

            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-10">
                    <div className="text-center mb-8">
                        <img src="/logo.png" alt="Yatrika Logo" className="h-16 w-auto mx-auto" />
                        <h1 className="text-2xl font-bold text-gray-800 mt-4">Welcome back</h1>
                        <p className="text-gray-500 mt-1 text-sm">Sign in to your Yatrika account</p>
                    </div>

                    {/* GitHub OAuth */}
                    <button
                        onClick={() => authApi.githubLogin()}
                        className="w-full flex items-center justify-center gap-3 border border-slate-300 rounded-xl py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-6"
                    >
                        <FiGithub size={18} />
                        Continue with GitHub
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 bg-white text-xs text-slate-400">or continue with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                            <div className="relative">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="input pl-11"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-slate-700">Password</label>
                                <Link to="/forgot-password" className="text-xs text-emerald-600 hover:underline font-medium">Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    required
                                    className="input pl-11 pr-11"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    onClick={() => setShowPass(!showPass)}
                                >
                                    {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* CAPTCHA */}
                        <HumanCaptcha
                            onVerified={() => setCaptchaVerified(true)}
                            onReset={() => setCaptchaVerified(false)}
                        />

                        <button
                            type="submit"
                            disabled={loading || !captchaVerified}
                            className="w-full btn-primary py-3.5 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-8">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-emerald-600 font-semibold hover:underline">Sign up</Link>
                    </p>
                    <p className="text-center text-sm text-slate-500 mt-2">
                        Want to be a guide?{' '}
                        <Link to="/register/guide" className="text-emerald-500 font-semibold hover:underline">Register as Guide</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
