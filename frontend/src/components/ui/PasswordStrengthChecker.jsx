import { FiCheck, FiX } from 'react-icons/fi'

export const PASSWORD_RULES = [
 { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
 { id: 'upper', label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
 { id: 'lower', label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
 { id: 'number', label: 'One number (0–9)', test: (p) => /[0-9]/.test(p) },
 { id: 'special', label: 'One special character (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function isPasswordValid(password) {
 return PASSWORD_RULES.every((r) => r.test(password))
}

export default function PasswordStrengthChecker({ password }) {
 if (!password) return null

 return (
 <div className="mt-2.5 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3">
 {PASSWORD_RULES.map((rule) => {
 const passed = rule.test(password)
 return (
 <div
 key={rule.id}
 className={`flex items-center gap-2 text-xs font-medium transition-colors duration-200 ${
 passed ? 'text-green-600' : 'text-red-500'
 }`}
 >
 <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
 passed ? 'bg-green-100' : 'bg-red-100'
 }`}>
 {passed ? <FiCheck size={10} /> : <FiX size={10} />}
 </span>
 {rule.label}
 </div>
 )
 })}
 </div>
 )
}
