import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi'
import useAuthStore from '../../store/authStore'
import { authApi } from '../../api/auth'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Navbar from './Navbar'

export default function DashboardLayout({ children, navItems, title, icon }) {
 const { user, clearAuth } = useAuthStore()
 const navigate = useNavigate()
 const queryClient = useQueryClient()
 const [sidebarOpen, setSidebarOpen] = useState(false)

 const handleLogout = async () => {
 try { await authApi.logout() } catch {}
 clearAuth()
 queryClient.clear()
 toast.success('Logged out')
 navigate('/')
 }

 const SidebarContent = () => (
 <>
 <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-5 py-4">
 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg mb-2 overflow-hidden">
 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.full_name + user?.id)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`} alt={user?.full_name} className="w-full h-full object-cover" />
 </div>
 <p className="text-white font-semibold text-sm truncate">{user?.full_name}</p>
 <p className="text-emerald-200 text-xs truncate">{user?.email}</p>
 <span className="badge bg-white/20 text-white text-xs mt-1.5">{icon} {user?.role}</span>
 </div>
 <nav className="p-2">
 {navItems.map((item, i) => (
 <motion.div
 key={item.to}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: i * 0.05 }}
 >
 <NavLink
 to={item.to}
 end={item.end}
 onClick={() => setSidebarOpen(false)}
 className={({ isActive }) =>
 `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
 isActive
 ? 'bg-emerald-50 text-emerald-700'
 : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'
 }`
 }
 >
 <span>{item.icon}</span>
 {item.label}
 </NavLink>
 </motion.div>
 ))}
 </nav>
 <div className="p-2 border-t border-gray-100">
 <button
 onClick={handleLogout}
 className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
 >
 <FiLogOut size={16} /> Logout
 </button>
 </div>
 </>
 )

 return (
 <div className="min-h-screen bg-gray-50">
 <Navbar />

 {/* Mobile sidebar toggle */}
 <div className="md:hidden px-4 pt-3">
 <button
 onClick={() => setSidebarOpen(true)}
 className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors w-full"
 >
 <FiMenu size={16} />
 <span>Menu</span>
 <span className="ml-auto badge bg-emerald-50 text-emerald-700 text-xs">{icon} {user?.role}</span>
 </button>
 </div>

 {/* Mobile sidebar overlay */}
 <AnimatePresence>
 {sidebarOpen && (
 <div className="fixed inset-0 z-50 md:hidden">
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
 onClick={() => setSidebarOpen(false)} 
 />
 <motion.div 
 initial={{ x: '-100%' }}
 animate={{ x: 0 }}
 exit={{ x: '-100%' }}
 transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
 className="absolute left-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-lg shadow-2xl overflow-y-auto"
 >
 <div className="flex items-center justify-between p-3 border-b border-gray-100">
 <span className="text-sm font-semibold text-gray-700">Navigation</span>
 <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
 <FiX size={18} />
 </button>
 </div>
 <SidebarContent />
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
 <div className="flex gap-6">
 {/* Desktop sidebar */}
 <aside className="w-56 flex-shrink-0 hidden md:block">
 <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-24">
 <SidebarContent />
 </div>
 </aside>

 {/* Main content */}
 <main className="flex-1 min-w-0">{children}</main>
 </div>
 </div>
 </div>
 )
}
