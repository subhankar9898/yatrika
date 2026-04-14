import { useState, useRef, useEffect } from 'react'
import { FiBell, FiCheck, FiCheckCircle , FiXCircle, FiAlertTriangle, FiMapPin, FiMap, FiCalendar, FiAward} from 'react-icons/fi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../api/axios'
import { formatDistanceToNow } from 'date-fns'

const TYPE_ICONS = {
  booking_request:  <FiCalendar />,
  booking_accepted: <FiCheckCircle />,
  booking_rejected: <FiXCircle />,
  guide_approved:   <FiAward />,
  guide_rejected:   <FiXCircle />,
  place_approved:   '<FiMap />️',
  place_rejected:   <FiXCircle />,
  guide_assigned:   <FiMapPin />,
  low_rating:       <FiAlertTriangle />,
  system:           <FiBell />,
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const qc = useQueryClient()

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=15').then(r => r.data),
    refetchInterval: 30000, // poll every 30s
  })

  const markAllRead = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const markOneRead = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const unread = data?.unread_count ?? 0
  const notifications = data?.notifications ?? []

  const handleOpen = () => {
    setOpen(o => !o)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-brand-600"
      >
        <FiBell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FiBell size={15} className="text-brand-500" />
              <span className="font-semibold text-sm text-gray-800">Notifications</span>
              {unread > 0 && (
                <span className="badge bg-red-100 text-red-600 text-xs">{unread} new</span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-brand-600 hover:underline flex items-center gap-1"
              >
                <FiCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <FiBell size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markOneRead.mutate(n.id)
                    if (n.link) { window.location.href = n.link; setOpen(false) }
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                    !n.is_read ? 'bg-brand-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || <FiBell />}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
