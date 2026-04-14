import { FiGlobe } from 'react-icons/fi'
export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
      {/* Logo pulse */}
      <div className="relative mb-6">
        <img src="/logo.png" alt="Loading Yatrika" className="h-16 w-auto animate-pulse" />
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-400 font-medium tracking-wide">Loading Yatrika...</p>
    </div>
  )
}
