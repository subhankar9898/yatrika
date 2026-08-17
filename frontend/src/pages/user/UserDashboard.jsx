import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    FiCalendar, FiMapPin, FiUser, FiClock, FiX, FiStar,
    FiClipboard, FiSearch, FiCheckCircle, FiCompass, FiXCircle,
    FiRefreshCw, FiMessageSquare
} from 'react-icons/fi'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StarRatingInput from '../../components/ui/StarRating'
import ChatModal from '../../components/ui/ChatModal'
import { bookingsApi, ratingsApi, guidesApi } from '../../api/index'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const NAV = [
    { to: '/user/dashboard', end: true, icon: <FiClipboard />, label: 'My Bookings' },
    { to: '/places', icon: <FiSearch />, label: 'Explore Places' },
]

const STATUS_STYLE = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    accepted: 'bg-green-100 text-green-700 border-green-200',
    started: 'bg-purple-100 text-purple-700 border-purple-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    expired: 'bg-gray-100 text-red-600 border-gray-300',
}
const STATUS_ICON = {
    pending: <FiClock className="inline" />,
    accepted: <FiCheckCircle className="inline" />,
    started: <FiCompass className="inline" />,
    rejected: <FiXCircle className="inline" />,
    completed: <FiStar className="inline" />,
    cancelled: <FiX className="inline" />,
    expired: <FiClock className="inline" />
}

function RatingModal({ booking, onClose }) {
    const [rating, setRating] = useState(0)
    const [review, setReview] = useState('')
    const queryClient = useQueryClient()

    const submit = useMutation({
        mutationFn: () => ratingsApi.submit({ booking_id: booking.id, rating, review_text: review }),
        onSuccess: () => {
            toast.success('Rating submitted! Thank you <FiStar />')
            queryClient.invalidateQueries(['my-bookings'])
            onClose()
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Failed to submit rating'),
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Rate Your Experience</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                </div>
                <p className="text-gray-500 text-sm mb-5">
                    How was your tour of <strong>{booking.place_name}</strong> with <strong>{booking.guide_name}</strong>?
                </p>
                <div className="flex justify-center mb-5">
                    <StarRatingInput value={rating} onChange={setRating} size={32} />
                </div>
                <textarea
                    className="input resize-none mb-4"
                    rows={3}
                    placeholder="Write a review (optional)..."
                    value={review}
                    onChange={e => setReview(e.target.value)}
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                    <button
                        onClick={() => submit.mutate()}
                        disabled={rating === 0 || submit.isPending}
                        className="flex-1 btn-primary disabled:opacity-50"
                    >
                        {submit.isPending ? 'Submitting...' : 'Submit Rating'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

function RescheduleModal({ booking, onClose }) {
    const [selectedSlotId, setSelectedSlotId] = useState(null)
    const queryClient = useQueryClient()

    const { data: slots = [], isLoading: slotsLoading } = useQuery({
        queryKey: ['guide-slots-reschedule', booking.guide_id],
        queryFn: () => {
            const today = new Date()
            const fromStr = today.toISOString().split('T')[0]
            const nextWeek = new Date()
            nextWeek.setDate(nextWeek.getDate() + 6)
            const toStr = nextWeek.toISOString().split('T')[0]
            return guidesApi.getSlots(booking.guide_id, { from_date: fromStr, to_date: toStr }).then(r => r.data)
        },
    })

    const availableSlots = slots.filter(
        s => s.status === 'available' && s.id !== booking.slot_id
    )

    const reschedule = useMutation({
        mutationFn: () => bookingsApi.reschedule(booking.id, selectedSlotId),
        onSuccess: (res) => {
            toast.success(`Rescheduled to ${res.data.new_date} at ${res.data.new_start?.slice(0, 5)}`)
            queryClient.invalidateQueries(['my-bookings'])
            onClose()
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Could not reschedule'),
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FiRefreshCw className="text-emerald-500" /> Reschedule Booking
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                </div>

                <div className="mb-4 bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                    <p><span className="font-medium">Place:</span> {booking.place_name}</p>
                    <p><span className="font-medium">Guide:</span> {booking.guide_name}</p>
                    <p><span className="font-medium">Current date:</span> {booking.booking_date} · {booking.slot_start?.slice(0, 5)}–{booking.slot_end?.slice(0, 5)}</p>
                </div>

                <p className="text-sm text-gray-500 mb-3">Select a new available slot:</p>

                {slotsLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
                    </div>
                ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No other available slots for this guide.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {availableSlots.map(slot => (
                            <button
                                key={slot.id}
                                onClick={() => setSelectedSlotId(slot.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${selectedSlotId === slot.id
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-gray-200 hover:border-emerald-300 text-gray-700'
                                    }`}
                            >
                                <span className="font-medium flex items-center gap-2">
                                    <FiCalendar size={13} /> {slot.slot_date}
                                </span>
                                <span className="text-gray-500 flex items-center gap-2 mt-0.5">
                                    <FiClock size={13} /> {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                    <button
                        onClick={() => reschedule.mutate()}
                        disabled={!selectedSlotId || reschedule.isPending}
                        className="flex-1 btn-primary disabled:opacity-50"
                    >
                        {reschedule.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

function BookingCard({ booking, onRate, onCancel, onComplete, onReschedule, onChat, index }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 group"
        >
            <div className="flex items-stretch">
                {/* Photo */}
                {booking.place_photo && (
                    <div className="w-28 flex-shrink-0 hidden sm:block">
                        <img src={booking.place_photo} alt={booking.place_name} className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex-1 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                            <h3 className="font-bold text-gray-800 text-sm sm:text-base">{booking.place_name}</h3>
                            <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-gray-500 flex-wrap">
                                <span className="flex items-center gap-1"><FiUser size={12} /> {booking.guide_name}</span>
                                <span className="flex items-center gap-1"><FiCalendar size={12} /> {booking.booking_date}</span>
                                <span className="flex items-center gap-1"><FiClock size={12} /> {booking.slot_start?.slice(0, 5)} – {booking.slot_end?.slice(0, 5)}</span>
                            </div>
                        </div>
                        <span className={`badge border text-xs ${STATUS_STYLE[booking.displayStatus]}`}>
                            {STATUS_ICON[booking.displayStatus]} {booking.displayStatus}
                        </span>
                    </div>

                    {/* Guide email (only after acceptance) */}
                    {booking.status === 'accepted' && booking.guide_email && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                            <span className="text-gray-500">Guide contact: </span>
                            <a href={`mailto:${booking.guide_email}`} className="text-green-700 font-semibold hover:underline">
                                {booking.guide_email}
                            </a>
                        </div>
                    )}

                    {/* Guide response */}
                    {booking.guide_response && (
                        <div className="mt-2 text-sm text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
                            Guide: "{booking.guide_response}"
                        </div>
                    )}

                    {/* OTP Generation View */}
                    {booking.status === 'accepted' && booking.start_code && (
                        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <p className="text-sm text-emerald-800">
                                Provide this 4-digit code to your guide to start the tour:
                            </p>
                            <div className="text-2xl font-black text-emerald-600 tracking-widest mt-1">
                                {booking.start_code}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                        {booking.displayStatus === 'pending' && (
                            <>
                                <button
                                    onClick={() => onCancel(booking.id)}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    Cancel Request
                                </button>
                                <button
                                    onClick={() => onReschedule(booking)}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-1"
                                >
                                    <FiRefreshCw size={11} /> Reschedule
                                </button>
                            </>
                        )}
                        {booking.displayStatus === 'expired' && (
                            <button
                                onClick={() => onReschedule(booking)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-1"
                            >
                                <FiRefreshCw size={11} /> Reschedule
                            </button>
                        )}
                        {(booking.displayStatus === 'accepted' || booking.displayStatus === 'started') && (
                            <button
                                onClick={() => onChat(booking)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                            >
                                <FiMessageSquare size={11} /> Chat
                            </button>
                        )}
                        {booking.status === 'started' && (
                            <button
                                onClick={() => onComplete(booking.id)}
                                disabled={booking.user_completed}
                                className="text-xs flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50 disabled:bg-gray-400"
                            >
                                {booking.user_completed ? 'Pending Guide\'s Confirmation...' : <>Mark as Complete</>}
                            </button>
                        )}
                        {booking.status === 'completed' && !booking.has_rating && (
                            <button
                                onClick={() => onRate(booking)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1"
                            >
                                <FiStar size={12} /> Rate Experience
                            </button>
                        )}
                        {booking.has_rating && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <FiStar size={12} className="fill-amber-400 text-amber-400" /> Rated
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export default function UserDashboard() {
    const [filter, setFilter] = useState('all')
    const [rateBooking, setRateBooking] = useState(null)
    const [rescheduleBooking, setRescheduleBooking] = useState(null)
    const [chatBooking, setChatBooking] = useState(null)
    const queryClient = useQueryClient()

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: () => bookingsApi.getMine().then(r => r.data),
    })

    const cancelMutation = useMutation({
        mutationFn: (id) => bookingsApi.cancel(id),
        onSuccess: () => {
            toast.success('Booking cancelled')
            queryClient.invalidateQueries(['my-bookings'])
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Could not cancel'),
    })

    const completeMutation = useMutation({
        mutationFn: (id) => bookingsApi.completeTour(id),
        onSuccess: (res) => {
            toast.success(res.data.message)
            queryClient.invalidateQueries(['my-bookings'])
        },
        onError: (e) => {
            const detail = e.response?.data?.detail
            const msg = typeof detail === 'string' ? detail : null
            if (msg?.toLowerCase().includes('waiting for')) {
                toast.success(msg)
                queryClient.invalidateQueries(['my-bookings'])
                return
            }
            if (msg?.toLowerCase().includes('already')) {
                toast(msg, { icon: 'ℹ️' })
                queryClient.invalidateQueries(['my-bookings'])
                return
            }
            toast.error(msg || 'Could not update tour completion')
        },
    })

    const enhancedBookings = bookings.map(b => {
        const todayStr = new Date().toISOString().split('T')[0]
        if (b.status === 'pending' && b.booking_date < todayStr) {
            return { ...b, displayStatus: 'expired' }
        }
        return { ...b, displayStatus: b.status }
    })

    const filtered = filter === 'all' ? enhancedBookings : enhancedBookings.filter(b => b.displayStatus === filter)

    const counts = enhancedBookings.reduce((acc, b) => {
        acc[b.displayStatus] = (acc[b.displayStatus] || 0) + 1
        return acc
    }, {})

    return (
        <DashboardLayout navItems={NAV} title="My Dashboard" icon=<FiUser />>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">My Bookings</h1>
                    <p className="text-gray-500 text-sm mt-1">Track and manage all your tour bookings</p>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Total', count: enhancedBookings.length, color: 'bg-gray-50 border-gray-200', text: 'text-gray-700' },
                        { label: 'Pending', count: counts.pending || 0, color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
                        { label: 'Confirmed', count: counts.accepted || 0, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
                        { label: 'In Progress', count: counts.started || 0, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
                        { label: 'Completed', count: counts.completed || 0, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
                    ].map((s, i) => (
                        <motion.div 
                            key={s.label} 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`rounded-xl border ${s.color} p-4 text-center`}
                        >
                            <div className={`text-2xl font-bold ${s.text}`}>{s.count}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
                    {['all', 'pending', 'accepted', 'started', 'completed', 'rejected', 'cancelled', 'expired'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-sm px-3 py-1.5 rounded-full border transition-all capitalize ${filter === f ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                                }`}
                        >
                            <span className="flex items-center gap-1.5 justify-center">
                                {f === 'all' ? 'All' : STATUS_ICON[f]}
                                {f !== 'all' && <span>{f}</span>}
                                {f !== 'all' && counts[f] ? `(${counts[f]})` : ''}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Booking list */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <span className="text-4xl text-gray-300 block mb-3 flex items-center justify-center"><FiCompass size={40} /></span>
                        <p className="text-gray-500 text-sm">No {filter === 'all' ? '' : filter} bookings yet.</p>
                        {filter === 'all' && (
                            <a href="/places" className="mt-4 inline-block btn-primary text-sm">Explore Places</a>
                        )}
                    </div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3"
                    >
                        <AnimatePresence>
                        {filtered.map((b, idx) => (
                            <BookingCard
                                key={b.id}
                                booking={b}
                                index={idx}
                                onRate={setRateBooking}
                                onCancel={(id) => cancelMutation.mutate(id)}
                                onComplete={(id) => completeMutation.mutate(id)}
                                onReschedule={setRescheduleBooking}
                                onChat={setChatBooking}
                            />
                        ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {rateBooking && (
                <RatingModal booking={rateBooking} onClose={() => setRateBooking(null)} />
            )}
            {rescheduleBooking && (
                <RescheduleModal booking={rescheduleBooking} onClose={() => setRescheduleBooking(null)} />
            )}
            {chatBooking && (
                <ChatModal booking={chatBooking} onClose={() => setChatBooking(null)} />
            )}
        </DashboardLayout>
    )
}
