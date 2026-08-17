import { useState, useRef, useEffect, useMemo } from 'react'
import { FiChevronDown, FiSearch } from 'react-icons/fi'

export const ZONE_OPTIONS = [
  { value: '', label: 'All Zones' },
  { value: 'Central', label: 'Central' },
  { value: 'Eastern', label: 'Eastern' },
  { value: 'North Eastern', label: 'North Eastern' },
  { value: 'Northern', label: 'Northern' },
  { value: 'Southern', label: 'Southern' },
  { value: 'Western', label: 'Western' },
]

export const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'user', label: 'User' },
  { value: 'guide', label: 'Guide' },
  { value: 'admin', label: 'Admin' },
]

export const ROLE_FORM_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'guide', label: 'Guide' },
  { value: 'admin', label: 'Admin' },
]

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose])
}

/** Standard themed dropdown — use instead of native <select> */
export function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = () => setOpen(false)
  useClickOutside(ref, close)

  const selected = options.find((o) => String(o.value) === String(value))
  const displayLabel = selected?.label ?? placeholder

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`dropdown-trigger text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {displayLabel}
        </span>
        <FiChevronDown
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          size={18}
        />
      </button>
      {open && (
        <ul className="dropdown-menu" role="listbox">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <li key={String(opt.value)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    close()
                  }}
                  className={`dropdown-item w-full text-left ${isSelected ? 'dropdown-item-selected' : ''}`}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Searchable combobox — type to filter; optional server search via onSearchChange */
export function SearchableSelect({
  value,
  onChange,
  options = [],
  search = '',
  onSearchChange,
  placeholder = 'Search...',
  loading = false,
  disabled = false,
  className = '',
  emptyMessage = 'No results found',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = () => setOpen(false)
  useClickOutside(ref, close)

  const selected = options.find((o) => String(o.value) === String(value))

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return options
    return options.filter((o) => {
      const hay = (o.searchText || o.label).toLowerCase()
      return hay.includes(term)
    })
  }, [options, search])

  const displayValue = open ? search : (selected?.label || search)

  const handleInputChange = (e) => {
    const next = e.target.value
    onSearchChange?.(next)
    if (value) onChange('')
    if (!open) setOpen(true)
  }

  const handleSelect = (opt) => {
    onChange(opt.value)
    onSearchChange?.(opt.label)
    close()
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        className={`dropdown-trigger dropdown-trigger-search relative text-sm ${disabled ? 'opacity-50 pointer-events-none' : ''} ${
          open ? 'ring-2 ring-emerald-500 border-transparent' : ''
        }`}
      >
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 shrink-0 pointer-events-none z-10" size={14} />
        <input
          type="text"
          disabled={disabled}
          className="w-full h-full pl-9 pr-9 border-0 bg-transparent text-sm leading-none text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          aria-label="Toggle options"
        >
          <FiChevronDown className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} size={16} />
        </button>
      </div>
      {open && (
        <ul className="dropdown-menu" role="listbox">
          {loading && (
            <li className="px-4 py-3 text-sm text-gray-400">Loading places...</li>
          )}
          {!loading && filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">{emptyMessage}</li>
          )}
          {!loading &&
            filtered.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <li key={String(opt.value)}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    className={`dropdown-item w-full text-left ${isSelected ? 'dropdown-item-selected' : ''}`}
                  >
                    {opt.label}
                  </button>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}
