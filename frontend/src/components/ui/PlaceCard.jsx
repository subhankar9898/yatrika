import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiStar, FiMapPin, FiClock, FiUsers, FiCamera, FiDollarSign } from 'react-icons/fi'

const TYPE_COLORS = {
  Temple: 'bg-orange-100 text-orange-700',
  Fort: 'bg-yellow-100 text-yellow-700',
  Museum: 'bg-purple-100 text-purple-700',
  Beach: 'bg-cyan-100 text-cyan-700',
  'National Park': 'bg-green-100 text-green-700',
  Palace: 'bg-pink-100 text-pink-700',
  Park: 'bg-emerald-100 text-emerald-700',
  Monument: 'bg-blue-100 text-blue-700',
  Waterfall: 'bg-teal-100 text-teal-700',
  Cave: 'bg-stone-100 text-stone-700',
}

const DEFAULT_COLOR = 'bg-brand-100 text-brand-700'

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      <FiStar className="text-amber-400 fill-amber-400" size={13} />
      <span className="text-sm font-semibold text-gray-700">{rating?.toFixed(1) || '–'}</span>
    </div>
  )
}

export default function PlaceCard({ place, index = 0 }) {
  const [imgError, setImgError] = useState(false)
  const navigate = useNavigate()

  const badgeColor = TYPE_COLORS[place.type] || DEFAULT_COLOR

  return (
    <div
      className="card group cursor-pointer opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
      onClick={() => navigate(`/places/${place.id}`)}
    >
      {/* Photo */}
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {!imgError ? (
          <img
            src={place.photo_url}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200">
            <span className="text-5xl"><FiMapPin /></span>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Fee badge */}
        <div className="absolute top-3 right-3">
          {place.entrance_fee_inr === 0 ? (
            <span className="badge bg-green-500 text-white text-xs shadow">Free Entry</span>
          ) : (
            <span className="badge bg-white/90 text-gray-700 text-xs shadow">
              ₹{place.entrance_fee_inr}
            </span>
          )}
        </div>

        {/* DSLR badge */}
        {place.dslr_allowed && (
          <div className="absolute top-3 left-3">
            <span className="badge bg-black/50 text-white text-xs backdrop-blur-sm">
              <FiCamera size={10} className="mr-1" />DSLR ✓
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Type badge */}
        <span className={`badge text-xs mb-2 ${badgeColor}`}>{place.type}</span>

        {/* Name */}
        <h3 className="font-bold text-gray-800 text-base leading-tight mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors">
          {place.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
          <FiMapPin size={12} className="text-brand-400 flex-shrink-0" />
          <span className="truncate">{place.city}, {place.state}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-sm">
          <StarRating rating={place.google_rating} />

          <div className="flex items-center gap-1 text-gray-500">
            <FiClock size={12} />
            <span>{place.time_needed_hrs ? `${place.time_needed_hrs}h` : '–'}</span>
          </div>

          <div className="flex items-center gap-1 text-gray-500">
            <FiUsers size={12} />
            <span>{place.guide_count} {place.guide_count === 1 ? 'guide' : 'guides'}</span>
          </div>
        </div>

        {/* Best time */}
        {place.best_time_to_visit && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Best time:</span>
            <span className="text-xs font-medium text-brand-600">{place.best_time_to_visit}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Skeleton loader for PlaceCard
export function PlaceCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton w-20" />
        <div className="h-5 skeleton w-3/4" />
        <div className="h-4 skeleton w-1/2" />
        <div className="flex justify-between mt-2">
          <div className="h-4 skeleton w-16" />
          <div className="h-4 skeleton w-12" />
          <div className="h-4 skeleton w-16" />
        </div>
      </div>
    </div>
  )
}
