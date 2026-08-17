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

const DEFAULT_COLOR = 'bg-emerald-100 text-emerald-700'

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

    return (
        <div
            className="card group cursor-pointer opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
            onClick={() => navigate(`/places/${place.id}`)}
        >
            {/* Photo */}
            <div className="relative h-40 overflow-hidden bg-gray-100">
                {!imgError ? (
                    <img
                        src={place.photo_url}
                        alt={place.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
                        <span className="text-5xl text-emerald-500"><FiMapPin strokeWidth={1.75} /></span>
                    </div>
                )}
                
                {/* Fee badge */}
                <div className="absolute top-2 right-2">
                    {place.entrance_fee_inr === 0 ? (
                        <span className="px-2 py-1 rounded-md bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold shadow-sm">Free</span>
                    ) : (
                        <span className="px-2 py-1 rounded-md bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-bold shadow-sm">
                            ₹{place.entrance_fee_inr}
                        </span>
                    )}
                </div>

                {/* DSLR badge */}
                {place.dslr_allowed && (
                    <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 rounded-md bg-black/50 text-white text-[10px] font-bold backdrop-blur-sm shadow-sm flex items-center gap-1">
                            <FiCamera size={10} />DSLR
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-3">
                <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-emerald-600 transition-colors">{place.name}</p>
                
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[60%]">
                        <FiMapPin size={10} className="flex-shrink-0" />
                        <span className="truncate">{place.city}</span>
                    </span>
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <FiStar size={10} className="fill-amber-400 text-amber-400" />
                        {place.google_rating ?? '–'}
                    </div>
                </div>
                
                <div className="flex items-center justify-between mt-1.5">
                    <span className="badge bg-gray-100 text-gray-600 text-[10px] px-2">{place.type}</span>
                    <span className="text-xs text-gray-500">
                        {place.guide_count} guide{place.guide_count !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </div>
    )
}

// Skeleton loader for PlaceCard
export function PlaceCardSkeleton() {
    return (
        <div className="card overflow-hidden">
            <div className="h-40 skeleton" />
            <div className="p-3 space-y-2">
                <div className="h-4 skeleton w-3/4" />
                <div className="flex justify-between mt-1">
                    <div className="h-3 skeleton w-1/3" />
                    <div className="h-3 skeleton w-1/4" />
                </div>
                <div className="flex justify-between mt-1.5">
                    <div className="h-4 skeleton w-1/4 rounded-full" />
                    <div className="h-3 skeleton w-1/5 mt-0.5" />
                </div>
            </div>
        </div>
    )
}
