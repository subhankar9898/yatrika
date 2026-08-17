import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { FiStar, FiMapPin, FiClock, FiArrowLeft, FiUsers, FiXCircle, FiCloud } from 'react-icons/fi'
import { placesApi } from '../../api/places'
import useAuthStore from '../../store/authStore'

function GuideCard({ guide, index }) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.05 }}
 >
 <Link to={`/guides/${guide.id}`}
 className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition-all group">
    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img 
            src={guide.profile_photo_url && !guide.profile_photo_url.includes('unsplash') ? guide.profile_photo_url : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(guide.full_name + guide.id)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`} 
            alt={guide.full_name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
        />
    </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-sm text-gray-800 group-hover:text-emerald-600 transition-colors">{guide.full_name}</p>
 <div className="flex items-center gap-3 mt-0.5">
 <span className="text-xs text-amber-600 flex items-center gap-0.5">
 <FiStar size={10} className="fill-amber-400 text-amber-400" />{Number(guide.average_rating).toFixed(1)}
 </span>
 <span className="text-xs text-gray-400">{guide.total_tours_completed} tours</span>
 </div>
 <div className="flex gap-1 mt-1 flex-wrap">
 {guide.languages?.slice(0,3).map(l => (
 <span key={l} className="badge bg-gray-100 text-gray-500 text-[10px]">{l}</span>
 ))}
 </div>
 </div>
 <span className="text-emerald-500 text-xs font-medium group-hover:translate-x-1 transition-transform">Book →</span>
 </Link>
 </motion.div>
 )
}

export default function PlaceDetailPage() {
 const { id } = useParams()
 const navigate = useNavigate()
 const { accessToken } = useAuthStore()
 const [imgError, setImgError] = useState(false)

 const { data: place, isLoading } = useQuery({
 queryKey: ['place', id],
 queryFn: () => placesApi.getById(id).then(r => r.data),
 })
 const { data: guides = [] } = useQuery({
 queryKey: ['place-guides', id],
 queryFn: () => placesApi.getGuides(id).then(r => r.data),
 enabled: !!id,
 })

 if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
 if (!place) return <div className="page-container text-center py-20 text-gray-400">Place not found.</div>

 return (
 <div className="min-h-screen bg-gray-50">
 <div className="relative h-72 md:h-96 bg-gray-200 overflow-hidden">
 {!imgError && place.photo_url
 ? <motion.img initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }} src={place.photo_url} alt={place.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
 : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-200 to-emerald-400"><span className="text-8xl"><FiMapPin /></span></div>}
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
 <button onClick={() => navigate(-1)} className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/30">
 <FiArrowLeft size={15} /> Back
 </button>
 <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-0 left-0 right-0 px-6 pb-6">
 <span className="badge bg-white/20 text-white text-xs backdrop-blur-sm mb-2">{place.type}</span>
 <h1 className="text-3xl font-bold text-white">{place.name}</h1>
 <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
 <FiMapPin size={13} /><span>{place.city}, {place.state}</span>
 </div>
 </motion.div>
 </div>

 <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-6">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 {[
 { label: 'Rating', value: place.google_rating?.toFixed(1) ?? '–', Icon: FiStar },
 { label: 'Visit Time', value: place.time_needed_hrs ? `${place.time_needed_hrs}h` : '–', Icon: FiClock },
 { label: 'Entry Fee', value: place.entrance_fee_inr === 0 ? 'Free' : `₹${place.entrance_fee_inr}`, icon: <span className="text-[1.75rem] font-semibold leading-none text-emerald-500">₹</span> },
 { label: 'Best Time', value: place.best_time_to_visit ?? '–', Icon: FiCloud },
 ].map(({ label, value, Icon, icon }) => (
 <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 text-center group">
 <div className="text-2xl mb-2 text-emerald-500 flex justify-center items-center group-hover:scale-110 transition-transform duration-200">
 {icon ?? <Icon size={26} strokeWidth={1.75} />}
 </div>
 <p className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{value}</p>
 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
 </div>
 ))}
 </div>

  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm">
 <h2 className="text-lg font-bold text-gray-800 mb-3">About</h2>
 <p className="text-gray-500 text-sm leading-relaxed">
 {place.description || `${place.name} is a ${place.type?.toLowerCase()} in ${place.city}, ${place.state}.${place.significance ? ` Known for its ${place.significance?.toLowerCase()} significance.` : ''}${place.establishment_year && place.establishment_year !== 'Unknown' ? ` Established in ${place.establishment_year}.` : ''}`}
 </p>
 </motion.div>

 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 p-6 shadow-sm">
 <h2 className="text-lg font-bold text-gray-800 mb-4">Details</h2>
 <div className="grid grid-cols-2 gap-y-3 text-sm">
 {[
 ['Significance', place.significance], ['Established', place.establishment_year],
 ['Weekly Off', place.weekly_off || 'None'], ['DSLR Camera', place.dslr_allowed ? <span className="flex items-center gap-1.5"> Allowed</span> : <span className="flex items-center gap-1.5"><FiXCircle /> Not Allowed</span>],
 ['Airport Nearby', place.has_airport_50km ? <span className="flex items-center gap-1.5"> Yes (50km)</span> : <span className="flex items-center gap-1.5"><FiXCircle /> No</span>],
 ['Zone', place.zone],
 ].filter(([, v]) => v).map(([label, value]) => (
 <div key={label} className="flex flex-col">
 <span className="text-gray-400 text-xs">{label}</span>
 <span className="font-medium text-gray-700">{value}</span>
 </div>
 ))}
 </div>
 </motion.div>
 </div>

 <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 p-5 h-fit sticky top-20 shadow-sm">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
 <FiUsers className="text-emerald-500" size={16} /> Guides
 </h2>
 <span className="badge bg-emerald-100 text-emerald-700 text-xs">{guides.length}</span>
 </div>
 {!accessToken ? (
 <div className="text-center py-4">
 <p className="text-sm text-gray-500 mb-3">Login to view and book guides</p>
 <Link to="/login" className="btn-primary text-sm py-2 px-4">Login</Link>
 </div>
 ) : guides.length === 0 ? (
 <div className="text-center py-6 text-gray-400 text-sm">No guides assigned yet</div>
 ) : (
 <div className="space-y-2">{guides.map((g, idx) => <GuideCard key={g.id} guide={g} index={idx} />)}</div>
 )}
 </motion.div>
 </div>
 </div>
 )
}
