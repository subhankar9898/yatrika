import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiStar, FiArrowLeft, FiCalendar, FiClock, FiMapPin, FiAlertCircle, FiMail , FiAward, FiSun} from 'react-icons/fi'
import { format, addDays, startOfToday } from 'date-fns'
import api from '../../api/axios'
import { bookingsApi } from '../../api/index'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const STATUS_STYLE = {
  available: 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 cursor-pointer',
  pending:   'bg-yellow-50 border-yellow-300 text-yellow-600 cursor-not-allowed opacity-70',
  booked:    'bg-red-50 border-red-300 text-red-500 cursor-not-allowed opacity-60 line-through',
}
const STATUS_LABEL = { available: 'Available', pending: 'Requested', booked: 'Booked' }

function SlotCalendar({ guideId, vacationDates, onSlotSelect }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const today = startOfToday()
  const weekStart = addDays(today, weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const from = format(weekStart, 'yyyy-MM-dd')
  const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')

  const { data: slots = [] } = useQuery({
    queryKey: ['guide-slots', guideId, from, to],
    queryFn: () => api.get(`/guides/${guideId}/slots`, { params: { from_date: from, to_date: to } }).then(r => r.data),
  })

  const slotsByDate = {}
  slots.forEach(s => {
    if (!slotsByDate[s.slot_date]) slotsByDate[s.slot_date] = []
    slotsByDate[s.slot_date].push(s)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
          ← Prev
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const isVacation = vacationDates.includes(dateStr)
          const daySlots = slotsByDate[dateStr] || []
          const isPast = day < today

          return (
            <div key={dateStr} className={`rounded-xl p-2 min-h-[90px] ${isVacation ? 'bg-gray-100' : 'bg-gray-50'} border border-gray-200`}>
              <p className={`text-xs font-semibold mb-2 text-center ${isPast ? 'text-gray-300' : 'text-gray-600'}`}>
                {format(day, 'EEE')}<br />
                <span className="text-base">{format(day, 'd')}</span>
              </p>

              {isVacation ? (
                <p className="text-xs text-center text-gray-400 mt-1"><FiSun /> Off</p>
              ) : daySlots.length === 0 ? (
                <p className="text-xs text-center text-gray-300 mt-2">—</p>
              ) : (
                <div className="space-y-1">
                  {daySlots.map(slot => (
                    <button
                      key={slot.id}
                      disabled={slot.status !== 'available' || isPast}
                      onClick={() => !isPast && slot.status === 'available' && onSlotSelect(slot)}
                      className={`w-full text-xs px-1.5 py-1 rounded-lg border font-medium transition-all ${isPast ? 'opacity-30 cursor-not-allowed' : STATUS_STYLE[slot.status]}`}
                      title={STATUS_LABEL[slot.status]}
                    >
                      {slot.start_time?.slice(0, 5)}<br />
                      <span className="opacity-70">{STATUS_LABEL[slot.status]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-3 h-3 rounded bg-green-200 border border-green-300" /> Available
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300" /> Requested
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-3 h-3 rounded bg-red-200 border border-red-300" /> Booked
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Vacation
        </div>
      </div>
    </div>
  )
}

function BookingModal({ slot, guide, onClose }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleBook = async () => {
    setLoading(true)
    try {
      await bookingsApi.create({ slot_id: slot.id, user_message: message })
      toast.success('Booking request sent to guide! <FiAward />')
      queryClient.invalidateQueries(['guide-slots'])
      queryClient.invalidateQueries(['notifications'])
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Confirm Booking</h2>
        <p className="text-gray-500 text-sm mb-5">Send a booking request to <strong>{guide.full_name}</strong></p>

        <div className="bg-brand-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-semibold">{slot.slot_date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span className="font-semibold">{slot.start_time?.slice(0,5)} – {slot.end_time?.slice(0,5)}</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Message to guide (optional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Tell the guide about your interests, group size, etc."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5 flex gap-2">
          <FiAlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-700">This slot will be marked as "Requested" for all users until the guide responds.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={handleBook} disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GuideProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const [selectedSlot, setSelectedSlot] = useState(null)

  const { data: guide, isLoading } = useQuery({
    queryKey: ['guide', id],
    queryFn: () => api.get(`/guides/${id}`).then(r => r.data),
  })

  const { data: vacationDates = [] } = useQuery({
    queryKey: ['guide-vacations', id],
    queryFn: () => api.get(`/guides/${id}/vacations`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="page-container">
      <div className="h-8 skeleton w-40 mb-4" />
      <div className="flex gap-5">
        <div className="w-20 h-20 skeleton rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-6 skeleton w-1/2" />
          <div className="h-4 skeleton w-1/3" />
        </div>
      </div>
    </div>
  )

  if (!guide) return <div className="page-container text-center py-20 text-gray-500">Guide not found.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 mb-6 transition-colors">
          <FiArrowLeft size={16} /> Back
        </button>

        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-3xl flex-shrink-0 overflow-hidden">
              {guide.profile_photo_url
                ? <img src={guide.profile_photo_url} alt={guide.full_name} className="w-full h-full object-cover" />
                : guide.full_name?.[0]?.toUpperCase()
              }
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800 font-serif">{guide.full_name}</h1>
              <div className="flex items-center gap-4 mt-2 flex-wrap text-sm text-gray-500">
                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  <FiStar size={14} className="fill-amber-400 text-amber-400" />
                  {guide.average_rating?.toFixed(1)} / 5.0
                </span>
                <span>{guide.total_tours_completed} tours completed</span>
                <span>{guide.experience_years} yr experience</span>
              </div>
              {/* Display Guide Email */}
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 font-medium">
                <FiMail className="text-gray-400" />
                <a href={`mailto:${guide.email}`} className="hover:text-brand-600 transition-colors">
                  {guide.email}
                </a>
              </div>
              {guide.languages?.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">

                  {guide.languages.map(l => (
                    <span key={l} className="badge bg-brand-50 text-brand-700 text-xs">{l}</span>
                  ))}
                </div>
              )}
              {guide.bio && <p className="text-gray-600 text-sm mt-3 leading-relaxed">{guide.bio}</p>}
            </div>
          </div>

          {/* Assigned places */}
          {guide.places?.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Guides At</p>
              <div className="flex gap-2 flex-wrap">
                {guide.places.map(p => (
                  <span key={p.id} onClick={() => navigate(`/places/${p.id}`)}
                    className="flex items-center gap-1.5 badge bg-gray-100 text-gray-600 text-xs cursor-pointer hover:bg-brand-100 hover:text-brand-700 transition-colors py-1 px-3">
                    <FiMapPin size={10} /> {p.name}, {p.city}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Slot Calendar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2">
            <FiCalendar className="text-brand-500" /> Availability
          </h2>
          <p className="text-gray-400 text-sm mb-5">
            {accessToken ? 'Click an available slot to book' : 'Log in to book a slot'}
          </p>

          {!accessToken ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-500 text-sm mb-3">You need to be logged in to book</p>
              <button onClick={() => navigate('/login')} className="btn-primary">Log In to Book</button>
            </div>
          ) : (
            <SlotCalendar
              guideId={guide.id}
              vacationDates={vacationDates}
              onSlotSelect={accessToken && user?.role === 'user' ? setSelectedSlot : null}
            />
          )}
        </div>
      </div>

      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          guide={guide}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  )
}
