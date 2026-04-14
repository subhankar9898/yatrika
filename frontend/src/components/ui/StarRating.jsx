import { useState } from 'react'
import { FiStar } from 'react-icons/fi'

export function StarDisplay({ rating, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <FiStar
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
      <span className="ml-1.5 text-sm font-semibold text-gray-700">{Number(rating).toFixed(1)}</span>
    </div>
  )
}

export default function StarRatingInput({ value, onChange, size = 24 }) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <FiStar
            size={size}
            className={
              i <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }
          />
        </button>
      ))}
    </div>
  )
}
