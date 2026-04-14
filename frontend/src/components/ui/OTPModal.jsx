import { useState, useRef, useEffect } from 'react'
import { FiX, FiMail, FiRefreshCw } from 'react-icons/fi'
import { authApi } from '../../api/auth'
import toast from 'react-hot-toast'

export default function OTPModal({ email, purpose = 'signup', onVerified, onClose }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
    const interval = setInterval(() => {
      setResendTimer(t => (t > 0 ? t - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) { toast.error('Please enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      await authApi.verifyOtp({ email, otp_code: code, purpose })
      toast.success('Email verified successfully!')
      onVerified()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid or expired OTP')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    try {
      await authApi.resendOtp({ email, purpose })
      toast.success('New OTP sent!')
      setResendTimer(60)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not resend OTP')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
            <FiMail className="text-brand-600" size={22} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FiX size={22} />
          </button>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-1">Verify your email</h2>
        <p className="text-gray-500 text-sm mb-6">
          We sent a 6-digit code to <strong className="text-gray-700">{email}</strong>. It expires in 10 minutes.
        </p>

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-all duration-200 focus:outline-none
                ${digit ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 focus:border-brand-400'}`}
            />
          ))}
        </div>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Verifying...
            </span>
          ) : 'Verify OTP'}
        </button>

        {/* Resend */}
        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={resendTimer > 0}
            className="flex items-center gap-1.5 text-sm mx-auto text-gray-500 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FiRefreshCw size={14} />
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  )
}
