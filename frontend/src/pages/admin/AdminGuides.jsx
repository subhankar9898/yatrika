import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiSearch, FiPlus, FiStar, FiEdit2, FiX, FiBriefcase, FiMessageCircle, FiPieChart, FiClock, FiUsers, FiCompass, FiMapPin, FiShield } from 'react-icons/fi'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminApi } from '../../api/index'
import api from '../../api/axios'
import { useDebounce } from '../../hooks'
import { StarDisplay } from '../../components/ui/StarRating'
import toast from 'react-hot-toast'
import { SearchableSelect } from '../../components/ui/Dropdown'

const NAV = [
 { to: '/admin', end: true, icon: <FiPieChart />, label: 'Dashboard' },
 { to: '/admin/approvals', icon: <FiClock />, label: 'Approvals' },
 { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
 { to: '/admin/guides', icon: <FiCompass />, label: 'Guides' },
 { to: '/admin/places', icon: <FiMapPin />, label: 'Places' },
]

const GUIDES_PER_PAGE = 10

function AssignPlaceModal({ guide, onClose }) {
 const [placeId, setPlaceId] = useState('')
 const [placeSearch, setPlaceSearch] = useState('')
 const queryClient = useQueryClient()

 const { data: placesData } = useQuery({
 queryKey: ['all-places-simple'],
 queryFn: () => api.get('/places', { params: { per_page: 50 } }).then(r => r.data),
 })

 // Filter places by search term
 const filteredPlaces = useMemo(() => {
 if (!placesData?.items) return []
 if (!placeSearch.trim()) return placesData.items
 const term = placeSearch.toLowerCase()
 return placesData.items.filter(p =>
 p.name.toLowerCase().includes(term) ||
 (p.city || '').toLowerCase().includes(term) ||
 (p.state || '').toLowerCase().includes(term)
 )
 }, [placesData, placeSearch])

 const assign = useMutation({
 mutationFn: () => adminApi.assignGuide(parseInt(placeId), guide.guide_profile_id),
 onSuccess: () => {
 toast.success('Guide assigned! Email sent to guide.')
 queryClient.invalidateQueries(['admin-guides'])
 onClose()
 },
 onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
 })

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
 <motion.div 
     initial={{ opacity: 0, scale: 0.9, y: 20 }}
     animate={{ opacity: 1, scale: 1, y: 0 }}
     exit={{ opacity: 0, scale: 0.9, y: 20 }}
     className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
 >
 <div className="flex items-center justify-between mb-1">
 <h2 className="text-lg font-bold text-gray-800">Assign Place to Guide</h2>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
 </div>
 <p className="text-gray-500 text-sm mb-4">{guide.full_name}</p>

 <SearchableSelect
 className="mb-4"
 value={placeId}
 onChange={setPlaceId}
 search={placeSearch}
 onSearchChange={setPlaceSearch}
 placeholder="Search places by name, city, or state..."
 emptyMessage="No places found"
 options={filteredPlaces.map((p) => ({
 value: String(p.id),
 label: `${p.name} — ${p.city}, ${p.state}`,
 searchText: `${p.name} ${p.city} ${p.state}`,
 }))}
 />

 <div className="flex gap-3">
 <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
 <button onClick={() => assign.mutate()} disabled={!placeId || assign.isPending} className="flex-1 btn-primary disabled:opacity-50">
 {assign.isPending ? 'Assigning...' : 'Assign Place'}
 </button>
 </div>
 </motion.div>
 </div>
 )
}

function EditGuideModal({ guide, onClose }) {
 const [form, setForm] = useState({ 
 bio: guide?.bio || '', 
 languages: guide?.languages?.join(', ') || '', 
 experience_years: guide?.experience_years || 0 
 })
 const queryClient = useQueryClient()
 const update = useMutation({
 mutationFn: () => adminApi.updateGuide(guide.guide_profile_id, {
 ...form,
 languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
 experience_years: parseInt(form.experience_years, 10) || 0
 }),
 onSuccess: () => {
 toast.success('Guide profile updated.')
 queryClient.invalidateQueries(['admin-guides'])
 onClose()
 },
 onError: (e) => toast.error(e.response?.data?.detail || 'Failed update'),
 })
 if (!guide) return null
 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
 <motion.div 
     initial={{ opacity: 0, scale: 0.9, y: 20 }}
     animate={{ opacity: 1, scale: 1, y: 0 }}
     exit={{ opacity: 0, scale: 0.9, y: 20 }}
     className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
 >
 <div className="flex items-center justify-between mb-5">
 <h2 className="text-lg font-bold text-gray-800">Edit Guide: {guide.full_name}</h2>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
 </div>
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
 <textarea className="input text-sm h-24 resize-none" value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">Languages (comma separated)</label>
 <input type="text" className="input text-sm" value={form.languages} onChange={e => setForm({...form, languages: e.target.value})} />
 </div>
 <div>
 <label className="block text-xs font-medium text-gray-600 mb-1">Experience Years</label>
 <input type="number" min="0" className="input text-sm" value={form.experience_years} onChange={e => setForm({...form, experience_years: e.target.value})} />
 </div>
 </div>
 <div className="flex gap-3 mt-6">
 <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
 <button onClick={() => update.mutate()} disabled={update.isPending} className="flex-1 btn-primary disabled:opacity-50">
 {update.isPending ? 'Saving...' : 'Save Changes'}
 </button>
 </div>
 </motion.div>
 </div>
 )
}

export default function AdminGuides() {
 const [search, setSearch] = useState('')
 const [assignModal, setAssignModal] = useState(null)
 const [editGuideModal, setEditGuideModal] = useState(null)
 const [page, setPage] = useState(1)
 const debouncedSearch = useDebounce(search, 400)

 const { data: allGuides = [], isLoading } = useQuery({
 queryKey: ['admin-guides'],
 queryFn: () => adminApi.getPendingGuides({ status: 'approved' }).then(r => r.data),
 })

 // Client-side search filter
 const guides = useMemo(() => {
 if (!debouncedSearch.trim()) return allGuides
 const term = debouncedSearch.toLowerCase()
 return allGuides.filter(g =>
 g.full_name?.toLowerCase().includes(term) ||
 g.email?.toLowerCase().includes(term) ||
 (g.languages || []).some(l => l.toLowerCase().includes(term))
 )
 }, [allGuides, debouncedSearch])

 // Client-side pagination
 const totalPages = Math.ceil(guides.length / GUIDES_PER_PAGE) || 1
 const paginatedGuides = guides.slice((page - 1) * GUIDES_PER_PAGE, page * GUIDES_PER_PAGE)

 // Reset page when search changes
 useEffect(() => { setPage(1) }, [debouncedSearch])

 return (
 <DashboardLayout navItems={NAV} icon={<FiShield className="inline" />}>
 <div className="space-y-5">
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div>
 <h1 className="text-2xl font-bold text-gray-800">Guides</h1>
 <p className="text-gray-500 text-sm">{guides.length} approved guides</p>
 </div>
 </div>

 <div className="relative max-w-xs">
 <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
 <input className="input pl-9 text-sm" placeholder="Search guides..."
 value={search} onChange={e => setSearch(e.target.value)} />
 </div>

 {isLoading && !guides ? (
 <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
 ) : (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <AnimatePresence>
 {paginatedGuides.map((g, i) => (
 <motion.div 
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: i * 0.05 }}
     key={g.guide_profile_id} 
     className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 group"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300 shadow-sm border border-emerald-100 overflow-hidden">
 <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(g.full_name + g.guide_profile_id)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`} alt={g.full_name} className="w-full h-full object-cover" />
 </div>
 <div>
 <p className="font-semibold text-gray-800">{g.full_name}</p>
 <p className="text-xs text-gray-400">{g.email}</p>
 </div>
 </div>
 <button
 onClick={() => setEditGuideModal(g)}
 className="text-gray-400 hover:text-emerald-600 transition-colors p-1"
 title="Edit Guide Profile"
 >
 <FiEdit2 size={16} />
 </button>
 </div>
 <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
 <span><FiBriefcase /> {g.experience_years} yrs</span>
 {g.languages?.length > 0 && <span><FiMessageCircle /> {g.languages.slice(0,2).join(', ')}</span>}
 </div>
 <button
 onClick={() => setAssignModal(g)}
 className="mt-4 w-full btn-secondary text-sm py-2 flex items-center justify-center gap-1.5"
 >
 <FiPlus size={14} /> Assign to Place
 </button>
 </motion.div>
 ))}
 </AnimatePresence>
 </motion.div>
 )}

 {guides.length === 0 && !isLoading && (
 <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
 <span className="text-4xl mb-3 block"><FiCompass /></span>
 <p className="text-gray-500">No approved guides yet</p>
 </div>
 )}

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
 <span className="text-xs text-gray-400">Page {page} of {totalPages} · {guides.length} guides</span>
 <div className="flex gap-2">
 <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
 className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
 <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
 className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
 </div>
 </div>
 )}
 </div>

 {assignModal && <AssignPlaceModal guide={assignModal} onClose={() => setAssignModal(null)} />}
 {editGuideModal && <EditGuideModal guide={editGuideModal} onClose={() => setEditGuideModal(null)} />}
 </DashboardLayout>
 )
}
