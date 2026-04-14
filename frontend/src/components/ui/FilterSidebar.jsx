import { FiX, FiSliders , FiStar} from 'react-icons/fi'

const MultiSelect = ({ label, options, value = [], onChange }) => (
  <div className="mb-4">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => {
            const next = value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]
            onChange(next)
          }}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-150 ${
            value.includes(opt)
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
)

const Toggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <button
      onClick={() => onChange(value === true ? null : true)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-in-out flex items-center p-1 ${value ? 'bg-brand-500' : 'bg-gray-200'}`}
    >
      <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
)

export default function FilterSidebar({ filters, options, onChange, onReset, isOpen, onClose }) {
  const activeCount = Object.values(filters).filter(v =>
    v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  ).length

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-72 bg-white border-r lg:border border-gray-200
        lg:rounded-xl lg:shadow-sm overflow-y-auto z-30 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        p-5 flex flex-col gap-2
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FiSliders size={16} className="text-brand-500" />
            <span className="font-semibold text-gray-800">Filters</span>
            {activeCount > 0 && (
              <span className="badge bg-brand-500 text-white text-xs">{activeCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button onClick={onReset} className="text-xs text-red-500 hover:underline">
                Reset all
              </button>
            )}
            <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
              <FiX size={18} />
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100 mb-2" />

        {/* Zone */}
        {options.zones?.length > 0 && (
          <MultiSelect label="Zone" options={options.zones} value={filters.zones || []}
            onChange={v => onChange('zones', v)} />
        )}

        {/* State */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">State</p>
          <select
            className="input text-sm"
            value={filters.state || ''}
            onChange={e => onChange('state', e.target.value || null)}
          >
            <option value="">All States</option>
            {options.states?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Type */}
        {options.types?.length > 0 && (
          <MultiSelect label="Place Type" options={options.types} value={filters.types || []}
            onChange={v => onChange('types', v)} />
        )}

        {/* Significance */}
        {options.significance?.length > 0 && (
          <MultiSelect label="Significance" options={options.significance} value={filters.significance || []}
            onChange={v => onChange('significance', v)} />
        )}

        {/* Rating */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Min Rating</p>
          <div className="flex gap-2">
            {[4.5, 4.0, 3.5].map(r => (
              <button key={r}
                onClick={() => onChange('min_rating', filters.min_rating === r ? null : r)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filters.min_rating === r ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                }`}
              >
                <FiStar /> {r}+
              </button>
            ))}
          </div>
        </div>

        {/* Fee */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Entrance Fee</p>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Free Entry', value: 'free' },
              { label: 'Under ₹100', value: '100' },
              { label: 'Under ₹500', value: '500' },
            ].map(opt => (
              <button key={opt.value}
                onClick={() => onChange('fee_filter', filters.fee_filter === opt.value ? null : opt.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border text-left transition-all ${
                  filters.fee_filter === opt.value ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">More Options</p>
          <Toggle label="DSLR Allowed" value={filters.dslr_allowed} onChange={v => onChange('dslr_allowed', v)} />
          <Toggle label="Airport Nearby" value={filters.has_airport} onChange={v => onChange('has_airport', v)} />
        </div>

        {/* Best Time */}
        {options.best_times?.length > 0 && (
          <MultiSelect label="Best Time to Visit" options={options.best_times} value={filters.best_times || []}
            onChange={v => onChange('best_times', v)} />
        )}
      </aside>
    </>
  )
}
