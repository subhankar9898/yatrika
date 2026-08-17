import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMail, FiLock, FiKey, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import PasswordStrengthChecker, { isPasswordValid } from '../../components/ui/PasswordStrengthChecker'

export default function ForgotPasswordPage() {
 const navigate = useNavigate()
 const [step, setStep] = useState(1) // 1: Email, 2: OTP & New Password
 const [loading, setLoading] = useState(false)
 const [showPass, setShowPass] = useState(false)

 // Form state
 const [email, setEmail] = useState('')
 const [otp, setOtp] = useState('')
 const [newPassword, setNewPassword] = useState('')

 const handleSendOtp = async (e) => {
 e.preventDefault()
 if (!email) return toast.error('Please enter your email')

 setLoading(true)
 try {
 await api.post('/auth/forgot-password', { email })
 toast.success('OTP sent to your email!')
 setStep(2)
 } catch (err) {
 toast.error(err.response?.data?.detail || 'Failed to send OTP')
 } finally {
 setLoading(false)
 }
 }

 const handleResetPassword = async (e) => {
 e.preventDefault()
 if (!otp) return toast.error('Please enter the OTP')
 if (!isPasswordValid(newPassword)) return toast.error('Please meet all password requirements')

 setLoading(true)
 try {
 await api.post('/auth/reset-password', {
 email,
 otp_code: otp,
 new_password: newPassword
 })
 toast.success('Password successfully reset! You can now log in.')
 navigate('/login')
 } catch (err) {
 toast.error(err.response?.data?.detail || 'Failed to reset password')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
 <div className="sm:mx-auto sm:w-full sm:max-w-md">
 <div className="text-center">
 <img src="/logo.png" alt="Yatrika Logo" className="h-16 w-auto mx-auto" />
 <h2 className="mt-4 text-2xl font-bold text-gray-800">
 {step === 1 ? 'Forgot Password?' : 'Set New Password'}
 </h2>
 <p className="mt-1 text-sm text-gray-500">
 {step === 1
 ? "Enter your email and we'll send you a reset code"
 : `Enter the OTP sent to ${email}`}
 </p>
 </div>
 </div>

 <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
 <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">

 {step === 1 ? (
 <form onSubmit={handleSendOtp} className="space-y-5">
 <div>
 <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
 Email address
 </label>
 <div className="relative">
 <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
 <input
 id="email"
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="input pl-9 block w-full"
 placeholder="you@example.com"
 />
 </div>
 </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full btn-primary py-3 disabled:opacity-50"
 >
 {loading ? (
 <span className="flex items-center justify-center gap-2">
 <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 Sending...
 </span>
 ) : 'Send Reset Code'}
 </button>

 <button
 type="button"
 onClick={() => navigate('/login')}
 className="w-full text-sm text-gray-500 hover:text-gray-700 flex justify-center items-center gap-1.5 mt-2"
 >
 <FiArrowLeft size={14} /> Back to Login
 </button>
 </form>

 ) : (
 <form onSubmit={handleResetPassword} className="space-y-5">
 {/* OTP input */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1.5">
 Reset Code (OTP)
 </label>
 <div className="relative">
 <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
 <input
 type="text"
 required
 value={otp}
 onChange={(e) => setOtp(e.target.value)}
 className="input pl-9 block w-full tracking-widest text-center text-lg font-bold"
 placeholder="• • • • • •"
 maxLength={6}
 />
 </div>
 </div>

 {/* New Password with strength checker */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1.5">
 New Password
 </label>
 <div className="relative">
 <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
 <input
 type={showPass ? 'text' : 'password'}
 required
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 className="input pl-9 pr-10 block w-full"
 placeholder="Create a strong password"
 />
 <button
 type="button"
 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
 onClick={() => setShowPass(!showPass)}
 >
 {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
 </button>
 </div>
 <PasswordStrengthChecker password={newPassword} />
 </div>

 <button
 type="submit"
 disabled={loading || !otp || !isPasswordValid(newPassword)}
 className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? (
 <span className="flex items-center justify-center gap-2">
 <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 Resetting...
 </span>
 ) : 'Reset Password'}
 </button>

 <button
 type="button"
 onClick={() => { setStep(1); setOtp(''); setNewPassword('') }}
 className="w-full text-sm text-gray-500 hover:text-gray-700 flex justify-center items-center gap-1.5"
 >
 <FiArrowLeft size={14} /> Use a different email
 </button>
 </form>
 )}
 </div>
 </div>
 </div>
 )
}
