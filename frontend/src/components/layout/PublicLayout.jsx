import { FiGlobe } from 'react-icons/fi'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>© 2025 <span className="text-white font-semibold">Yatrika</span> — Your Smart Tourism Companion <img src="/logo.png" alt="Yatrika" className="h-4 inline ml-1 align-sub" /></p>
      </footer>
    </div>
  )
}
