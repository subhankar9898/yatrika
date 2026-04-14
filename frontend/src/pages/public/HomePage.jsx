import { Link } from 'react-router-dom'
import { FiArrowRight, FiMapPin , FiGlobe, FiSearch, FiCalendar, FiShield, FiCompass, FiBell, FiStar} from 'react-icons/fi'
import useAuthStore from '../../store/authStore'

const STATS = [
  { icon: <FiMapPin />, label: 'Tourist Places', value: '325+' },
  { icon: <FiCompass />, label: 'Verified Guides', value: '100+' },
  { icon: <FiGlobe />, label: 'Indian States', value: '28+' },
  { icon: <FiStar />, label: 'Avg Guide Rating', value: '4.6' },
]

const FEATURES = [
  { icon: <FiSearch />, title: 'Smart Discovery', desc: 'Filter 325+ places by zone, type, rating, fee, and more. Instant debounce-powered search.' },
  { icon: <FiCompass />, title: 'Expert Local Guides', desc: 'Book verified guides with flexible 2–3 hour slots. See real-time availability.' },
  { icon: <FiCalendar />, title: 'Easy Booking', desc: 'Send requests, track status, and get email confirmations — multi-day trips supported.' },
  { icon: <FiStar />, title: 'Trusted Reviews', desc: 'Rate your guide after each tour. Transparent ratings help future travellers choose.' },
  { icon: <FiBell />, title: 'Real-time Alerts', desc: 'Instant notifications when guides accept or reject your booking requests.' },
  { icon: <FiShield />, title: 'Secure Platform', desc: 'MFA, OTP verification, GitHub OAuth, and anomaly detection protect your account.' },
]

const HIGHLIGHTS = [
  { photo: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400', name: 'Taj Mahal', city: 'Agra', rating: 4.8 },
  { photo: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400', name: 'Red Fort', city: 'Delhi', rating: 4.5 },
  { photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', name: 'Calangute Beach', city: 'Goa', rating: 4.4 },
  { photo: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400', name: 'City Palace', city: 'Jaipur', rating: 4.4 },
]

export default function HomePage() {
  const { accessToken } = useAuthStore()

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1600)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <img src="/logo.png" alt="Yatrika Logo" className="h-24 sm:h-32 mb-6 mx-auto drop-shadow-xl" />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
            Discover India with<br />
            <span className="text-brand-200">Expert Local Guides</span>
          </h1>
          <p className="text-brand-100 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Explore 325+ incredible destinations. Book verified local guides, plan multi-day trips, and experience India like never before.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {accessToken ? (
              <Link to="/places" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:bg-brand-50 transition-all shadow-lg text-base sm:text-lg">
                Explore Places <FiArrowRight size={20} />
              </Link>
            ) : (
              <>
                <Link to="/register" className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:bg-brand-50 transition-all shadow-lg text-base sm:text-lg">
                  Get Started Free <FiArrowRight size={20} />
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 border-2 border-white/60 text-white font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:bg-white/10 transition-all text-base sm:text-lg">
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-2xl sm:text-3xl mb-1">{s.icon}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-600">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Featured Destinations</h2>
            <p className="text-gray-500 mt-2">Some of India's most iconic places</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {HIGHLIGHTS.map((p, i) => (
              <div key={i} className="card group overflow-hidden cursor-pointer opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}>
                <div className="relative h-32 sm:h-44 overflow-hidden">
                  <img src={p.photo} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute bottom-2 right-2 badge bg-black/60 text-white text-xs"><FiStar /> {p.rating}</div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><FiMapPin size={10} />{p.city}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to={accessToken ? '/places' : '/register'} className="btn-primary px-8 py-3 text-base inline-flex items-center gap-2">
              {accessToken ? 'Explore All 325+ Places' : 'Sign Up to Explore'} <FiArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Everything You Need</h2>
            <p className="text-gray-500 mt-2">A complete platform for your India trip</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all duration-200 group">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="font-bold text-gray-800 mb-2 group-hover:text-brand-600 transition-colors">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!accessToken && (
        <section className="py-16 bg-gradient-to-r from-brand-600 to-brand-800 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 px-4">Ready to Explore India?</h2>
          <p className="text-brand-100 mb-8 max-w-xl mx-auto px-4 text-sm sm:text-base">Join thousands of travellers discovering India's rich history, culture, and beauty with expert guides.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/register" className="bg-white text-brand-700 font-bold px-8 py-3 rounded-xl hover:bg-brand-50 transition-all shadow-lg">Create Free Account</Link>
            <Link to="/register/guide" className="border-2 border-white/60 text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-all">Become a Guide</Link>
          </div>
        </section>
      )}
    </div>
  )
}
