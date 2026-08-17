import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    FiCalendar, FiPlus, FiTrash2, FiCheck, FiX, FiStar, FiSun,
    FiClipboard, FiMap, FiCompass, FiMapPin, FiClock,
    FiXCircle, FiAlertTriangle, FiUser, FiCheckCircle, FiMessageSquare, FiVideo
} from 'react-icons/fi'
import { format, addDays, startOfToday, parseISO, isWithinInterval } from 'date-fns'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { StarDisplay } from '../../components/ui/StarRating'
import ChatModal from '../../components/ui/ChatModal'
import { Select, SearchableSelect, ZONE_OPTIONS } from '../../components/ui/Dropdown'
import { guidesApi, bookingsApi } from '../../api/index'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const NAV = [
    { to: '/guide/dashboard', end: true, icon: <FiClipboard />, label: 'Bookings' },
    { to: '/guide/dashboard?tab=slots', icon: <FiCalendar />, label: 'My Slots' },
    { to: '/guide/dashboard?tab=vacation', icon: <FiSun />, label: 'Vacation Mode' },
    { to: '/guide/dashboard?tab=ratings', icon: <FiStar />, label: 'My Ratings' },
    { to: '/guide/dashboard?tab=places', icon: <FiMap />, label: 'Place Requests' },
]

// ─── Bookings Tab ─────────────────────────────────────────────────────────────
function BookingsTab() {
    const queryClient = useQueryClient()
    const [responding, setResponding] = useState(null)
    const [responseText, setResponseText] = useState('')
    const [startCodes, setStartCodes] = useState({})
    const [chatBooking, setChatBooking] = useState(null)

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['guide-bookings'],
        queryFn: () => guidesApi.getMyBookings().then(r => r.data),
    })

    const respond = useMutation({
        mutationFn: ({ id, action }) => guidesApi.respondBooking(id, { action, guide_response: responseText }),
        onSuccess: (_, { action }) => {
            toast.success(`Booking ${action}ed`)
            queryClient.invalidateQueries(['guide-bookings'])
            queryClient.invalidateQueries(['notifications'])
            setResponding(null)
            setResponseText('')
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
    })

    const startMutation = useMutation({
        mutationFn: ({ id, code }) => bookingsApi.startTour(id, code),
        onSuccess: (res) => {
            toast.success(res.data.message)
            queryClient.invalidateQueries(['guide-bookings'])
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Failed to start tour'),
    })

    const completeMutation = useMutation({
        mutationFn: (id) => bookingsApi.completeTour(id),
        onSuccess: (res) => {
            toast.success(res.data.message)
            queryClient.invalidateQueries(['guide-bookings'])
        },
        onError: (e) => {
            const detail = e.response?.data?.detail
            const msg = typeof detail === 'string' ? detail : null
            if (msg?.toLowerCase().includes('waiting for')) {
                toast.success(msg)
                queryClient.invalidateQueries(['guide-bookings'])
                return
            }
            if (msg?.toLowerCase().includes('already')) {
                toast(msg, { icon: 'ℹ️' })
                queryClient.invalidateQueries(['guide-bookings'])
                return
            }
            toast.error(msg || 'Could not update tour completion')
        },
    })

    const STATUS_STYLE = {
        pending: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        accepted: 'bg-green-50 border-green-200 text-green-700',
        started: 'bg-purple-50 border-purple-200 text-purple-700',
        rejected: 'bg-red-50 border-red-200 text-red-600',
        completed: 'bg-blue-50 border-blue-200 text-blue-700',
        cancelled: 'bg-gray-50 border-gray-200 text-gray-500',
    }

    if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>

    return (
        <div className="space-y-3">
            {bookings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <FiCalendar size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No booking requests yet</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <AnimatePresence>
                    {bookings.map((b, i) => (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={b.id} 
                    className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-100 p-4 hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 group"
                >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <p className="font-bold text-gray-800">{b.place_name}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                                <span><FiUser /> {b.user_name}</span>
                                <a href={`mailto:${b.user_email}`} className="text-emerald-600 hover:underline text-xs">{b.user_email}</a>
                                <span><FiCalendar /> {b.booking_date}</span>
                                <span><FiClock /> {b.slot_start?.slice(0, 5)} – {b.slot_end?.slice(0, 5)}</span>
                            </div>
                            {b.user_message && (
                                <p className="text-sm text-gray-500 italic mt-2 bg-gray-50 rounded-lg px-3 py-1.5">"{b.user_message}"</p>
                            )}
                        </div>
                        <span className={`badge border text-xs ${STATUS_STYLE[b.status]}`}>{b.status}</span>
                    </div>
                    {(b.status === 'accepted' || b.status === 'started') && (
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => setChatBooking(b)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                            >
                                <FiMessageSquare size={11} /> Chat
                            </button>
                        </div>
                    )}
                    {b.status === 'pending' && (
                        responding === b.id ? (
                            <div className="mt-3 space-y-2">
                                <textarea className="input resize-none text-sm" rows={2}
                                    placeholder="Optional message to user..."
                                    value={responseText} onChange={e => setResponseText(e.target.value)} />
                                <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                                    <button onClick={() => respond.mutate({ id: b.id, action: 'accept' })}
                                        disabled={respond.isPending}
                                        className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                                        <FiCheckCircle size={16} /> Confirm Accept
                                    </button>
                                    <button onClick={() => respond.mutate({ id: b.id, action: 'reject' })}
                                        disabled={respond.isPending}
                                        className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                                        <FiXCircle size={16} /> Confirm Reject
                                    </button>
                                    <button onClick={() => setResponding(null)}
                                        className="min-h-[42px] inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors sm:flex-none">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => setResponding(b.id)}
                                    className="btn-primary text-xs py-1.5 px-4">Respond</button>
                            </div>
                        )
                    )}
                    {b.status === 'accepted' && (
                        <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl gap-3 flex-wrap">
                            <span className="text-sm text-emerald-800 font-medium">Verify 4-Digit Tour Code:</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="XXXX"
                                    maxLength={4}
                                    value={startCodes[b.id] || ''}
                                    onChange={(e) => setStartCodes(prev => ({ ...prev, [b.id]: e.target.value.replace(/\D/g, '') }))}
                                    className="w-20 text-center tracking-widest font-black rounded-lg border-emerald-300 focus:ring-emerald-500 text-emerald-700"
                                />
                                <button
                                    onClick={() => startMutation.mutate({ id: b.id, code: startCodes[b.id] })}
                                    disabled={!startCodes[b.id] || startCodes[b.id].length !== 4 || startMutation.isPending}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                                >
                                    Start Tour
                                </button>
                            </div>
                        </div>
                    )}
                    {b.status === 'started' && (
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => completeMutation.mutate(b.id)}
                                disabled={b.guide_completed || completeMutation.isPending}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                            >
                                {b.guide_completed ? 'Pending User\'s Confirmation...' : 'Mark as Complete'}
                            </button>
                        </div>
                    )}
                </motion.div>
            ))}
            </AnimatePresence>
            </motion.div>
            )}
            {chatBooking && (
                <ChatModal booking={chatBooking} onClose={() => setChatBooking(null)} />
            )}
        </div>
    )
}

// ─── Slots Tab ────────────────────────────────────────────────────────────────
function SlotsTab() {
    const queryClient = useQueryClient()
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ place_id: '', slot_date: '', start_time: '', end_time: '' })

    const { data: slots = [] } = useQuery({
        queryKey: ['my-slots'],
        queryFn: () => guidesApi.getMySlots().then(r => r.data),
    })
    const { data: profile } = useQuery({
        queryKey: ['my-guide-profile'],
        queryFn: () => guidesApi.getMyProfile().then(r => r.data),
    })

    const addSlot = useMutation({
        mutationFn: () => guidesApi.createSlot({ ...form, place_id: parseInt(form.place_id) }),
        onSuccess: () => { toast.success('Slot created'); queryClient.invalidateQueries(['my-slots']); setShowAdd(false) },
        onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
    })

    const deleteSlot = useMutation({
        mutationFn: (id) => guidesApi.deleteSlot(id),
        onSuccess: () => { toast.success('Slot deleted'); queryClient.invalidateQueries(['my-slots']) },
        onError: (e) => toast.error(e.response?.data?.detail || 'Cannot delete'),
    })

    // Group by date
    const byDate = {}
    slots.forEach(s => { if (!byDate[s.slot_date]) byDate[s.slot_date] = []; byDate[s.slot_date].push(s) })

    const STATUS_STYLE = {
        available: 'bg-green-50 border-green-200 text-green-700',
        pending: 'bg-yellow-50 border-yellow-200 text-yellow-600',
        booked: 'bg-red-50 border-red-200 text-red-600',
    }

    return (
        <div className="space-y-4">
            {/* Alert if no places assigned */}
            {profile && (!profile.places || profile.places.length === 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                    <strong><FiAlertTriangle /> No places assigned yet.</strong> Ask the admin to assign tourist places to your profile before you can create time slots.
                </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-gray-500">Manage your available time slots (max 2 per day, 2–3 hrs each)</p>
                <button onClick={() => setShowAdd(!showAdd)}
                    disabled={!profile?.places?.length}
                    className="btn-primary text-sm py-2 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                    <FiPlus size={15} /> Add Slot
                </button>
            </div>

            <AnimatePresence>
            {showAdd && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white rounded-2xl border border-emerald-200 p-5 overflow-hidden"
                >
                    <h3 className="font-semibold text-gray-800 mb-4">New Time Slot</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Place</label>
                            <Select
                                className="w-full"
                                value={form.place_id}
                                onChange={(v) => setForm({ ...form, place_id: v })}
                                placeholder="Select place..."
                                options={[
                                    { value: '', label: 'Select place...' },
                                    ...(profile?.places?.map((p) => ({ value: String(p.id), label: p.name })) || []),
                                ]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                            <input type="date" className="input text-sm"
                                min={format(startOfToday(), 'yyyy-MM-dd')}
                                value={form.slot_date} onChange={e => setForm({ ...form, slot_date: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                            <input type="time" className="input text-sm" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                            <input type="time" className="input text-sm" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => addSlot.mutate()} disabled={addSlot.isPending} className="btn-primary text-sm disabled:opacity-50">
                            {addSlot.isPending ? 'Creating...' : 'Create Slot'}
                        </button>
                        <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {Object.keys(byDate).sort().map((date, i) => (
                <motion.div 
                    key={date} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-100 p-4 hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 group"
                >
                    <p className="font-semibold text-gray-700 text-sm mb-3">
                        <FiCalendar /> {format(new Date(date + 'T00:00:00'), 'EEEE, MMM d yyyy')}
                    </p>
                    <div className="space-y-2">
                        {byDate[date].map(slot => (
                            <div key={slot.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${STATUS_STYLE[slot.status]}`}>
                                <div className="flex items-center gap-3 text-sm">
                                    <FiCalendar size={14} />
                                    <span className="font-medium">{slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}</span>
                                    <span className="text-xs capitalize opacity-70">{slot.status}</span>
                                </div>
                                {slot.status === 'available' && (
                                    <button onClick={() => deleteSlot.mutate(slot.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                                        <FiTrash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            ))}

            {slots.length === 0 && !showAdd && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <FiCalendar size={36} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No slots yet. Add your availability above.</p>
                </div>
            )}
        </div>
    )
}

// ─── Vacation Tab ─────────────────────────────────────────────────────────────
function VacationTab() {
    const queryClient = useQueryClient()
    const [selectedDates, setSelectedDates] = useState([])
    const [reason, setReason] = useState('')

    const { data: vacations = [] } = useQuery({
        queryKey: ['my-vacations'],
        queryFn: () => api.get('/guides/me/vacations').then(r => r.data),
    })

    const addVacation = useMutation({
        mutationFn: () => api.post('/guides/me/vacations', { dates: selectedDates, reason }),
        onSuccess: () => {
            toast.success('Vacation dates blocked')
            queryClient.invalidateQueries(['my-vacations'])
            setSelectedDates([])
            setReason('')
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
    })

    const removeVacation = useMutation({
        mutationFn: (id) => api.delete(`/guides/me/vacations/${id}`),
        onSuccess: () => { toast.success('Date unblocked'); queryClient.invalidateQueries(['my-vacations']) },
    })

    // Next 30 days calendar for selection
    const today = startOfToday()
    const next30 = Array.from({ length: 30 }, (_, i) => addDays(today, i + 1))

    const toggleDate = (d) => {
        const str = format(d, 'yyyy-MM-dd')
        setSelectedDates(prev => prev.includes(str) ? prev.filter(x => x !== str) : [...prev, str])
    }

    return (
        <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <FiSun className="inline mr-1.5" size={15} />
                <strong>Vacation Mode:</strong> Block out days when you're unavailable. Users won't be able to book you on these dates.
            </div>

            {/* Date picker */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Select Dates to Block</h3>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5 mb-4">
                    {next30.map(d => {
                        const str = format(d, 'yyyy-MM-dd')
                        const isBlocked = vacations.some(v => v.date === str)
                        const isSelected = selectedDates.includes(str)
                        return (
                            <button
                                key={str}
                                onClick={() => !isBlocked && toggleDate(d)}
                                disabled={isBlocked}
                                title={isBlocked ? 'Already blocked' : format(d, 'MMM d')}
                                className={`aspect-square rounded-lg text-xs font-medium transition-all border ${isBlocked ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' :
                                        isSelected ? 'bg-amber-400 text-white border-amber-400' :
                                            'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                                    }`}
                            >
                                {format(d, 'd')}
                            </button>
                        )
                    })}
                </div>
                {selectedDates.length > 0 && (
                    <div className="space-y-3">
                        <input className="input text-sm" placeholder="Reason (optional, e.g. Personal holiday)"
                            value={reason} onChange={e => setReason(e.target.value)} />
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">{selectedDates.length} date(s) selected</span>
                            <button onClick={() => addVacation.mutate()} disabled={addVacation.isPending}
                                className="btn-primary text-sm py-2 disabled:opacity-50">
                                {addVacation.isPending ? 'Blocking...' : 'Block Selected Dates'}
                            </button>
                            <button onClick={() => setSelectedDates([])} className="text-sm text-gray-400 hover:text-gray-600">Clear</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Blocked dates list */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-3">Currently Blocked Dates</h3>
                {vacations.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">No vacation dates set</p>
                ) : (
                    <div className="space-y-2">
                        {vacations.map(v => (
                            <div key={v.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
                                <div>
                                    <span className="font-medium text-amber-800 text-sm">{v.date}</span>
                                    {v.reason && <span className="text-amber-600 text-xs ml-2">— {v.reason}</span>}
                                </div>
                                <button onClick={() => removeVacation.mutate(v.id)} className="text-amber-500 hover:text-red-500 transition-colors p-1">
                                    <FiX size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Ratings Tab ──────────────────────────────────────────────────────────────
function RatingsTab() {
    const { data } = useQuery({
        queryKey: ['my-ratings'],
        queryFn: () => guidesApi.getMyRatings().then(r => r.data),
    })

    if (!data) return <div className="h-24 skeleton rounded-xl" />

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-extrabold text-emerald-600">{Number(data.average_rating).toFixed(1)}</div>
                    <StarDisplay rating={data.average_rating} size={18} />
                    <p className="text-sm text-gray-400 mt-1">{data.total_tours_completed} tours completed</p>
                </div>
                <div className="flex-1">
                    {[5, 4, 3, 2, 1].map(n => {
                        const count = data.ratings.filter(r => r.rating === n).length
                        const pct = data.ratings.length ? Math.round((count / data.ratings.length) * 100) : 0
                        return (
                            <div key={n} className="flex items-center gap-2 mb-1">
                                <span className="text-xs w-3 text-gray-500">{n}</span>
                                <FiStar size={11} className="text-amber-400 fill-amber-400" />
                                <div className="flex-1 bg-gray-100 rounded-full h-2">
                                    <div className="bg-amber-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="space-y-3">
                {data.ratings.map(r => (
                    <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-800 text-sm">{r.user_name}</span>
                            <StarDisplay rating={r.rating} size={13} />
                        </div>
                        {r.review_text && <p className="text-sm text-gray-500 italic">"{r.review_text}"</p>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                ))}
                {data.ratings.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                        <FiStar size={36} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No ratings yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Place Management / Requests Tab ────────────────────────────────────────────
function PlaceRequestsTab() {
    const [activeSubTab, setActiveSubTab] = useState('existing') // existing | new
    const queryClient = useQueryClient()

    // 1. Existing Places Logic
    const [selectedPlaceId, setSelectedPlaceId] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [divisionFilter, setDivisionFilter] = useState('')

    const { data: placesData, isFetching: isSearching } = useQuery({
        queryKey: ['public-places', searchTerm, divisionFilter],
        queryFn: () => api.get('/places', {
            params: { search: searchTerm || undefined, zone: divisionFilter || undefined, per_page: 50 }
        }).then(r => r.data)
    })
    const { data: assignmentReqs = [] } = useQuery({
        queryKey: ['my-assignment-requests'],
        queryFn: () => guidesApi.getAssignmentRequests().then(r => r.data)
    })
    const requestAssignment = useMutation({
        mutationFn: () => guidesApi.requestAssignment({ place_id: parseInt(selectedPlaceId) }),
        onSuccess: () => {
            toast.success('Assignment request sent to admin!')
            queryClient.invalidateQueries(['my-assignment-requests'])
            setSelectedPlaceId('')
            setSearchTerm('')
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Request failed')
    })

    // 2. New Place Logic
    const [form, setForm] = useState({ place_name: '', city: '', state: '', zone: '', type: '', significance: '', description: '', entrance_fee_inr: 0 })
    const submitNewPlace = useMutation({
        mutationFn: () => guidesApi.submitPlaceRequest(form),
        onSuccess: () => {
            toast.success('Place request submitted!')
            setForm({ place_name: '', city: '', state: '', zone: '', type: '', significance: '', description: '', entrance_fee_inr: 0 })
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
    })

    const STATUS_STYLE = {
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        approved: 'bg-green-50 text-green-700 border-green-200',
        rejected: 'bg-red-50 text-red-600 border-red-200'
    }

    return (
        <div className="space-y-4">
            {/* Sub-tab selection */}
            <div
                className="grid grid-cols-2 gap-1 w-full sm:max-w-xl rounded-2xl bg-gray-100/90 p-1.5 border border-gray-200 shadow-sm"
                role="tablist"
                aria-label="Place request type"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubTab === 'existing'}
                    onClick={() => setActiveSubTab('existing')}
                    className={`min-h-[44px] rounded-xl px-3 sm:px-5 text-xs sm:text-sm font-semibold text-center whitespace-nowrap transition-all duration-200 ${activeSubTab === 'existing'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
                        }`}
                >
                    Assign Existing Place
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubTab === 'new'}
                    onClick={() => setActiveSubTab('new')}
                    className={`min-h-[44px] rounded-xl px-3 sm:px-5 text-xs sm:text-sm font-semibold text-center whitespace-nowrap transition-all duration-200 ${activeSubTab === 'new'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
                        }`}
                >
                    Suggest New Place
                </button>
            </div>

            {activeSubTab === 'existing' ? (
                <div className="space-y-5 animate-fade-in">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="font-semibold text-gray-800 mb-2">Request to Guide an Existing Place</h3>
                        <p className="text-sm text-gray-500 mb-4">Select a place that already exists on Yatrika. Once the admin approves your request, you can create time slots for it.</p>

                        <div className="flex flex-row items-center gap-2 mb-3">
                            <SearchableSelect
                                className="flex-1 min-w-0"
                                value={selectedPlaceId}
                                onChange={setSelectedPlaceId}
                                search={searchTerm}
                                onSearchChange={setSearchTerm}
                                loading={isSearching}
                                placeholder="Search places by name or city..."
                                emptyMessage="No places found. Try another name or zone."
                                options={(placesData?.items || []).map((p) => ({
                                    value: String(p.id),
                                    label: `${p.name} (${p.city})`,
                                    searchText: `${p.name} ${p.city} ${p.state || ''}`,
                                }))}
                            />
                            <Select
                                className="w-[7.5rem] sm:w-44 shrink-0"
                                value={divisionFilter}
                                onChange={setDivisionFilter}
                                options={ZONE_OPTIONS}
                            />
                        </div>

                        <div className="flex gap-2 flex-col sm:flex-row items-center">
                            <button
                                onClick={() => requestAssignment.mutate()}
                                disabled={!selectedPlaceId || requestAssignment.isPending}
                                className="btn-primary py-2 px-6 text-sm disabled:opacity-50 w-full sm:w-auto"
                            >
                                {requestAssignment.isPending ? 'Requesting...' : 'Request Assignment'}
                            </button>
                        </div>
                    </div>

                    <h4 className="font-semibold text-gray-700 px-1 mt-6">My Assignment Requests</h4>
                    {assignmentReqs.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                            No requests made yet.
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {assignmentReqs.map((req, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={req.id} 
                                    className="bg-gradient-to-br from-white to-gray-50/80 rounded-xl border border-gray-100 p-4 flex items-center justify-between hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 group"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-800">{req.place_name}</p>
                                        <p className="text-xs text-gray-500">Requested on {new Date(req.created_at).toLocaleDateString()}</p>
                                        {req.admin_note && <p className="text-xs text-red-500 mt-1 italic">Note: {req.admin_note}</p>}
                                    </div>
                                    <span className={`badge border text-xs capitalize ${STATUS_STYLE[req.status]}`}>{req.status}</span>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-emerald-200 p-5 animate-fade-in">
                    <h3 className="font-semibold text-gray-800 mb-2">Suggest a completely new place</h3>
                    <p className="text-sm text-gray-500 mb-4">If the place is not listed anywhere on Yatrika, fill out this form to submit a new entry for the admin to review and add to the platform catalog.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            ['place_name', 'Place Name', 'text'], ['city', 'City', 'text'],
                            ['state', 'State', 'text'], ['zone', 'Zone', 'text'],
                            ['type', 'Type (e.g. Temple, Beach)', 'text'],
                            ['significance', 'Significance (e.g. Historical)', 'text'],
                        ].map(([k, l, t]) => (
                            <div key={k}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                                <input type={t} className="input text-sm bg-gray-50" value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                            </div>
                        ))}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Entrance Fee (₹)</label>
                            <input type="number" min={0} className="input text-sm bg-gray-50" value={form.entrance_fee_inr} onChange={e => setForm({ ...form, entrance_fee_inr: parseInt(e.target.value) })} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea className="input resize-none text-sm bg-gray-50" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={() => submitNewPlace.mutate()} disabled={submitNewPlace.isPending || !form.place_name} className="btn-primary text-sm disabled:opacity-50">
                            {submitNewPlace.isPending ? 'Submitting...' : 'Submit New Place Application'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Application / verification status ──────────────────────────────────────
function ApplicationStatusSection() {
    const { data: profile } = useQuery({
        queryKey: ['my-guide-profile'],
        queryFn: () => guidesApi.getMyProfile().then((r) => r.data),
    })

    if (!profile || profile.approval_status !== 'pending') {
        return null
    }

    if (profile.meet_status === 'scheduled' && profile.meet_link) {
        return (
            <div className="card p-5 border border-green-200 bg-green-50 animate-fade-in-up">
                <h2 className="text-lg font-bold text-green-800 mb-2 flex items-center gap-2">
                    <FiVideo className="text-green-600" />
                    Verification Call Scheduled
                </h2>
                {profile.meet_title && (
                    <p className="text-sm font-semibold text-green-800 mb-1">{profile.meet_title}</p>
                )}
                <p className="text-sm text-green-700 mb-4">
                    Check your email for the meeting time and link, or join directly below:
                </p>
                <a
                    href={profile.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                    <FiVideo size={16} /> Join Google Meet
                </a>
                {profile.meet_scheduled_at && (
                    <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                        <FiCalendar size={12} />
                        Scheduled {new Date(profile.meet_scheduled_at).toLocaleString('en-IN')}
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="card p-5 border border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-800 font-medium">
                ⏳ Verification Pending — Admin will schedule a Google Meet call before reviewing your application.
            </p>
        </div>
    )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function GuideDashboard() {
    const [searchParams, setSearchParams] = useSearchParams()
    const tab = searchParams.get('tab') || 'bookings'

    const TABS = {
        bookings: { label: '<FiClipboard /> Bookings', component: <BookingsTab /> },
        slots: { label: '<FiCalendar /> My Slots', component: <SlotsTab /> },
        vacation: { label: '<FiSun /> Vacation', component: <VacationTab /> },
        ratings: { label: '<FiStar /> Ratings', component: <RatingsTab /> },
        places: { label: '<FiMap />️ Place Requests', component: <PlaceRequestsTab /> },
    }

    return (
        <DashboardLayout navItems={NAV} icon=<FiCompass />>
            <div className="space-y-5">
                <h1 className="text-2xl font-bold text-gray-800">Guide Dashboard</h1>

                <ApplicationStatusSection />

                {/* Mobile tab switcher */}
                <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
                    {Object.entries(TABS).map(([key, { label }]) => (
                        <a key={key} href={`?tab=${key}`}
                            className={`flex-shrink-0 text-xs px-3 py-2 rounded-full border transition-all ${tab === key ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'
                                }`}
                        >{label}</a>
                    ))}
                </div>

                {TABS[tab]?.component || <BookingsTab />}
            </div>
        </DashboardLayout>
    )
}
