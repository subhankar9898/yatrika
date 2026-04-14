import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FiCalendar, FiMapPin, FiUser, FiClock, FiX, FiStar,
  FiClipboard, FiSearch, FiCheckCircle, FiCompass, FiXCircle 
} from 'react-icons/fi'
import DashboardLayout from '../../components/layout/DashboardLayout'
import StarRatingInput from '../../components/ui/StarRating'
import { bookingsApi, ratingsApi } from '../../api/index'
import api from '../../api/axios'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/user/dashboard', end: true, icon: <FiClipboard />, label: 'My Bookings' },
  { to: '/places', icon: <FiSearch />, label: 'Explore Places' },
]

const STATUS_STYLE = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  accepted:  'bg-green-100 text-green-700 border-green-200',
  started:   'bg-purple-100 text-purple-700 border-purple-200',
  rejected:  'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}
const STATUS_ICON = { 
  pending: <FiClock className="inline" />, 
  accepted: <FiCheckCircle className="inline" />, 
  started: <FiCompass className="inline" />, 
  rejected: <FiXCircle className="inline" />, 
  completed: <FiStar className="inline" />, 
  cancelled: <FiX className="inline" /> 
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
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
      </div>
    </div>
  )
}

function BookingCard({ booking, onRate, onCancel, onComplete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
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
                <span className="flex items-center gap-1"><FiClock size={12} /> {booking.slot_start?.slice(0,5)} – {booking.slot_end?.slice(0,5)}</span>
              </div>
            </div>
            <span className={`badge border text-xs ${STATUS_STYLE[booking.status]}`}>
              {STATUS_ICON[booking.status]} {booking.status}
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
            <div className="mt-3 bg-brand-50 border border-brand-200 rounded-lg p-3">
              <p className="text-sm text-brand-800">
                Provide this 4-digit code to your guide to start the tour:
              </p>
              <div className="text-2xl font-black text-brand-600 tracking-widest mt-1">
                {booking.start_code}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {booking.status === 'pending' && (
              <button
                onClick={() => onCancel(booking.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                Cancel Request
              </button>
            )}
            {booking.status === 'started' && (
              <button
                onClick={() => onComplete(booking.id)}
                disabled={booking.user_completed}
                className="text-xs flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50 disabled:bg-gray-400"
              >
                {booking.user_completed ? 'Pending Guide\'s Confirmation...' : <><FiCheckCircle /> Mark as Complete</>}
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
    </div>
  )
}

export default function UserDashboard() {
  const [filter, setFilter] = useState('all')
  const [rateBooking, setRateBooking] = useState(null)
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
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to complete tour'),
  })

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', count: bookings.length, color: 'bg-gray-50 border-gray-200', text: 'text-gray-700' },
            { label: 'Pending', count: counts.pending || 0, color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
            { label: 'Confirmed', count: counts.accepted || 0, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
            { label: 'In Progress', count: counts.started || 0, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
            { label: 'Completed', count: counts.completed || 0, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.color} p-4 text-center`}>
              <div className={`text-2xl font-bold ${s.text}`}>{s.count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
          {['all', 'pending', 'accepted', 'started', 'completed', 'rejected', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-all capitalize ${
                filter === f ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
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
            {[1,2,3].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}
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
          <div className="space-y-3">
            {filtered.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                onRate={setRateBooking}
                onCancel={(id) => cancelMutation.mutate(id)}
                onComplete={(id) => completeMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {rateBooking && (
        <RatingModal booking={rateBooking} onClose={() => setRateBooking(null)} />
      )}
    </DashboardLayout>
  )
}
