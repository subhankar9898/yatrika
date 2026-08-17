import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { FiArrowRight, FiMapPin, FiGlobe, FiSearch, FiCalendar, FiShield, FiCompass, FiBell, FiStar } from 'react-icons/fi'
import { Helmet } from 'react-helmet-async'
import useAuthStore from '../../store/authStore'

const heroContentVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.14, delayChildren: 0.25 },
  },
}

const heroItemVariants = {
  hidden: { opacity: 0, y: 36, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  },
}

const featuredGridVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.14, delayChildren: 0.08 },
  },
}

const featuredCardVariants = {
  hidden: { opacity: 0, y: 56, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
}

const featuresGridVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.06 },
  },
}

const featureCardVariants = {
  hidden: { opacity: 0, y: 44, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
}

function FeatureCard({ feature, index }) {
  return (
    <motion.div variants={featureCardVariants} className="h-full">
      <motion.article
        className="relative h-full overflow-hidden rounded-2xl bg-white p-6 sm:p-7 border border-gray-100 shadow-sm ring-1 ring-gray-100/80 group"
        whileHover={{ y: -8 }}
        transition={{ type: 'spring', stiffness: 340, damping: 24 }}
      >
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-100/60 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />
        <motion.div
          className="relative w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-5 border border-emerald-100/80 transition-colors duration-300 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500"
          whileHover={{ scale: 1.12, rotate: -4 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16 }}
        >
          <motion.span
            className="flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + index * 0.05, duration: 0.4 }}
          >
            {feature.icon}
          </motion.span>
        </motion.div>
        <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-emerald-600 transition-colors duration-300">
          {feature.title}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
        <div className="mt-4 h-0.5 w-8 bg-emerald-500/30 rounded-full group-hover:w-full group-hover:bg-emerald-500 transition-all duration-500 ease-out" />
      </motion.article>
    </motion.div>
  )
}

function FeaturedDestinationCard({ place, index }) {
  return (
    <motion.div variants={featuredCardVariants} className="h-full">
      <Link to="/places" className="block h-full group outline-none">
        <motion.article
          className="relative h-full overflow-hidden rounded-2xl bg-white shadow-lg border border-gray-100/80 ring-1 ring-gray-100"
          whileHover={{ y: -10, scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        >
          <div className="relative h-64 sm:h-72 overflow-hidden">
            <motion.img
              src={place.photo}
              alt={place.name}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.12 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />
            <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/15 transition-colors duration-500" />
            <motion.div
              className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none"
              aria-hidden
            />
            <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest text-white/90 bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
              #{index + 1}
            </span>
            <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold text-white bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
              <FiStar size={12} className="text-amber-400 fill-amber-400" />
              {place.rating}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white">
            <h3 className="font-bold text-lg sm:text-xl mb-1 group-hover:text-emerald-200 transition-colors duration-300">
              {place.name}
            </h3>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm text-gray-200">
                <FiMapPin size={13} className="text-emerald-400 shrink-0" strokeWidth={1.75} />
                {place.city}
              </span>
              <span className="text-xs font-semibold text-emerald-300 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex items-center gap-1">
                Explore <FiArrowRight size={12} />
              </span>
            </div>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  )
}

const STATS = [
  { icon: <FiMapPin />, label: 'Tourist Places', value: '325+' },
  { icon: <FiCompass />, label: 'Verified Guides', value: '100+' },
  { icon: <FiGlobe />, label: 'Indian States', value: '20+' },
  { icon: <FiStar />, label: 'Avg Guide Rating', value: '4.6' },
]

const FEATURES = [
  { icon: <FiSearch />, title: 'Smart Discovery', desc: 'Filter 325+ places by zone, type, rating, fee, and more. Instant debounce-powered search.' },
  { icon: <FiCompass />, title: 'Expert Local Guides', desc: 'Book verified guides with flexible 2–3 hour slots. See real-time availability.' },
  { icon: <FiCalendar />, title: 'Easy Booking', desc: 'Send requests, track status, and get email confirmations — multi-day trips supported.' },
  { icon: <FiStar />, title: 'Trusted Reviews', desc: 'Rate your guide after each tour. Transparent ratings help future travellers choose.' },
  { icon: <FiBell />, title: 'Real-time Alerts', desc: 'Instant notifications when guides accept or reject your booking requests.' },
  { icon: <FiShield />, title: 'Secure Platform', desc: 'Admin-verified guides, email-verified accounts, and secure booking flows keep your profile and trip details protected.' },
]

const HIGHLIGHTS = [
  { photo: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=600', name: 'Taj Mahal', city: 'Agra', rating: 4.8 },
  { photo: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600', name: 'Red Fort', city: 'Delhi', rating: 4.5 },
  { photo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600', name: 'Calangute Beach', city: 'Goa', rating: 4.4 },
  { photo: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=600', name: 'City Palace', city: 'Jaipur', rating: 4.4 },
]

export default function HomePage() {
  const { accessToken } = useAuthStore()
  const { scrollY } = useScroll()
  const heroImageY = useTransform(scrollY, [0, 500], ['0%', '18%'])
  const heroOverlayOpacity = useTransform(scrollY, [0, 400], [0.85, 0.95])

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Discover India with Expert Guides</title>
        <meta name="description" content="Explore 325+ incredible destinations in India and book verified local guides." />
      </Helmet>

      {/* ── Hero ── */}
      <section className="relative text-white overflow-hidden min-h-[88vh] flex items-center">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0 w-full h-[112%] -top-[6%]"
            style={{ y: heroImageY }}
          >
            <motion.img
              src="https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1600"
              alt="Taj Mahal, India"
              className="w-full h-full object-cover object-[center_22%] sm:object-[center_26%]"
              initial={{ scale: 1.06, opacity: 0 }}
              animate={{ scale: [1.06, 1.14, 1.06], opacity: 1 }}
              transition={{
                opacity: { duration: 1.4, ease: 'easeOut' },
                scale: { duration: 22, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          </motion.div>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20"
            style={{ opacity: heroOverlayOpacity }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
          />
          <motion.div
            className="pointer-events-none absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <motion.div
            className="max-w-2xl"
            variants={heroContentVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={heroItemVariants} className="flex items-center gap-3 mb-6">
              {/* <motion.img
                src="/logo.png"
                alt="Yatrika"
                className="h-14 drop-shadow-lg"
                whileHover={{ scale: 1.05, rotate: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              /> */}
            </motion.div>
            <motion.h1
              variants={heroItemVariants}
              className="text-4xl sm:text-6xl font-bold mb-6 leading-tight tracking-tight"
            >
              Discover India<br />
              <motion.span
                className="text-emerald-400 inline-block"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                with Expert Guides
              </motion.span>
            </motion.h1>
            <motion.p
              variants={heroItemVariants}
              className="text-gray-200 text-lg sm:text-xl mb-10 leading-relaxed max-w-xl"
            >
              Explore 325+ incredible destinations. Book verified local guides, plan multi-day trips, and experience India like never before.
            </motion.p>
            <motion.div variants={heroItemVariants} className="flex flex-wrap gap-4">
              {accessToken ? (
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                  <Link to="/places" className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 shadow-lg shadow-emerald-900/30">
                    Explore Places <FiArrowRight size={20} />
                  </Link>
                </motion.div>
              ) : (
                <>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                    <Link to="/register" className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 shadow-lg shadow-emerald-900/30">
                      Get Started Free <FiArrowRight size={20} />
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                    <Link to="/login" className="text-base px-8 py-3.5 rounded-xl border border-white/40 text-white hover:bg-white/10 transition-all duration-200 flex items-center backdrop-blur-sm">
                      Log In
                    </Link>
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative z-10 -mt-10 max-w-4xl mx-auto px-4">
        <motion.div
          className="glass-card grid grid-cols-2 md:grid-cols-4 gap-6 p-7"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
            >
              <div className="text-2xl mb-2 text-emerald-500 flex justify-center group-hover:scale-110 transition-transform duration-200">
                {s.icon}
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{s.value}</div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Featured Destinations ── */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-white">
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-teal-200/25 blur-3xl" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-3">
              Handpicked for you
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">Featured Destinations</h2>
            <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto">
              Some of India&apos;s most iconic places, waiting to be explored.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7"
            variants={featuredGridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.12, margin: '0px 0px -60px 0px' }}
          >
            {HIGHLIGHTS.map((p, i) => (
              <FeaturedDestinationCard key={p.name} place={p} index={i} />
            ))}
          </motion.div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <Link to={accessToken ? '/places' : '/register'} className="btn-secondary inline-flex items-center gap-2 px-8 py-3 shadow-md hover:shadow-lg">
              {accessToken ? 'Explore All 325+ Places' : 'Sign Up to Explore'} <FiArrowRight />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-24 overflow-hidden bg-gray-50">
        <div className="pointer-events-none absolute top-0 left-1/4 h-80 w-80 rounded-full bg-emerald-100/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-10 right-0 h-64 w-64 rounded-full bg-teal-100/35 blur-3xl" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-3">
              Built for travellers
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">Everything You Need</h2>
            <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto">
              A complete, secure platform for your India trip.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7"
            variants={featuresGridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1, margin: '0px 0px -48px 0px' }}
          >
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      {!accessToken && (
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-800" />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }} />
          <div className="relative max-w-3xl mx-auto px-4 text-center text-white z-10">
            <h2 className="text-3xl sm:text-5xl font-bold mb-5">Ready to Explore India?</h2>
            <p className="text-emerald-100 mb-10 text-lg font-light">Join thousands of travellers discovering India's rich history, culture and beauty with expert guides.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-white text-emerald-800 font-bold px-10 py-4 rounded-xl hover:bg-gray-50 transition shadow-lg text-base">
                Create Free Account
              </Link>
              <Link to="/register/guide" className="border border-white/50 text-white font-semibold px-10 py-4 rounded-xl hover:bg-white/10 transition text-base">
                Become a Guide
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
