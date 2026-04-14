import { useState, useEffect, useCallback, useRef } from 'react'
import { FiSearch, FiX, FiSliders, FiMapPin , FiStar} from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { placesApi } from '../../api/places'
import { useDebounce } from '../../hooks'
import PlaceCard, { PlaceCardSkeleton } from '../../components/ui/PlaceCard'
import FilterSidebar from '../../components/ui/FilterSidebar'
import Pagination from '../../components/ui/Pagination'

const INITIAL_FILTERS = {
  zones: [], types: [], significance: [], best_times: [],
  state: null, min_rating: null, fee_filter: null,
  dslr_allowed: null, has_airport: null,
}

function buildParams(filters, search, page, sort) {
  const p = { page, per_page: 12, sort_by: sort.by, sort_order: sort.order }
  if (search) p.search = search
  if (filters.state) p.state = filters.state
  if (filters.min_rating) p.min_rating = filters.min_rating
  if (filters.dslr_allowed) p.dslr_allowed = true
  if (filters.has_airport) p.has_airport = true
  if (filters.fee_filter === 'free') p.free_entry = true
  else if (filters.fee_filter) p.max_fee = parseInt(filters.fee_filter)
  // multi-selects — send first selected (extend API for comma-separated if needed)
  if (filters.zones?.length === 1) p.zone = filters.zones[0]
  if (filters.types?.length === 1) p.type = filters.types[0]
  if (filters.significance?.length === 1) p.significance = filters.significance[0]
  if (filters.best_times?.length === 1) p.best_time = filters.best_times[0]
  return p
}

export default function PlacesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page') || '1', 10)
  const isFirstMount = useRef(true)

  const setPage = (p) => {
    setSearchParams(prev => {
      if (p === 1) prev.delete('page')
      else prev.set('page', p)
      return prev
    })
  }

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [sort, setSort] = useState({ by: 'google_rating', order: 'desc' })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Reset to page 1 on any filter/search change
  useEffect(() => { 
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    setPage(1) 
  }, [debouncedSearch, filters, sort])

  const params = buildParams(filters, debouncedSearch, page, sort)

  const { data, isLoading } = useQuery({
    queryKey: ['places', params],
    queryFn: () => placesApi.getAll(params).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: filterOptions } = useQuery({
    queryKey: ['place-filter-options'],
    queryFn: () => placesApi.getFilterOptions
      ? placesApi.getFilterOptions().then(r => r.data)
      : fetch('/api/v1/places/filters/options').then(r => r.json()),
    staleTime: Infinity,
  })

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS)
    setSearch('')
  }

  const activeFilterCount = Object.values(filters).filter(v =>
    v !== null && !(Array.isArray(v) && v.length === 0)
  ).length + (search ? 1 : 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-800 text-white py-6 sm:py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Explore India</h1>
          <p className="text-brand-200 text-sm mb-6">
            Discover {data?.total ?? '325+'} incredible tourist destinations
          </p>

          {/* Search bar */}
          <div className="relative max-w-xl">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search places, cities, states, types..."
              className="w-full pl-11 pr-10 py-3 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <FilterSidebar
            filters={filters}
            options={filterOptions || {}}
            onChange={updateFilter}
            onReset={resetFilters}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Mobile filter toggle */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-2 btn-secondary text-sm py-2"
                >
                  <FiSliders size={15} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="badge bg-brand-500 text-white text-xs">{activeFilterCount}</span>
                  )}
                </button>

                {/* Result count */}
                <p className="text-sm text-gray-500">
                  {isLoading ? 'Loading...' : (
                    <><strong className="text-gray-800">{data?.total ?? 0}</strong> places found</>
                  )}
                </p>
              </div>

              {/* Sort */}
              <select
                className="input text-sm w-auto py-2"
                value={`${sort.by}:${sort.order}`}
                onChange={e => {
                  const [by, order] = e.target.value.split(':')
                  setSort({ by, order })
                }}
              >
                <option value="google_rating:desc">Highest Rated</option>
                <option value="google_rating:asc">Lowest Rated</option>
                <option value="name:asc">Name A–Z</option>
                <option value="entrance_fee_inr:asc">Fee: Low to High</option>
                <option value="entrance_fee_inr:desc">Fee: High to Low</option>
                <option value="time_needed_hrs:asc">Shortest Visit</option>
              </select>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {search && (
                  <span className="badge bg-brand-100 text-brand-700 gap-1">
                    "{search}"
                    <button onClick={() => setSearch('')} className="ml-1 hover:text-brand-900">×</button>
                  </span>
                )}
                {filters.state && (
                  <span className="badge bg-brand-100 text-brand-700">
                    {filters.state}
                    <button onClick={() => updateFilter('state', null)} className="ml-1">×</button>
                  </span>
                )}
                {filters.min_rating && (
                  <span className="badge bg-amber-100 text-amber-700">
                    <FiStar /> {filters.min_rating}+
                    <button onClick={() => updateFilter('min_rating', null)} className="ml-1">×</button>
                  </span>
                )}
                {filters.fee_filter && (
                  <span className="badge bg-green-100 text-green-700">
                    {filters.fee_filter === 'free' ? 'Free Entry' : `≤ ₹${filters.fee_filter}`}
                    <button onClick={() => updateFilter('fee_filter', null)} className="ml-1">×</button>
                  </span>
                )}
                {[...( filters.zones || []), ...(filters.types || []), ...(filters.significance || [])].map(v => (
                  <span key={v} className="badge bg-gray-100 text-gray-600">
                    {v}
                    <button
                      onClick={() => {
                        ['zones', 'types', 'significance'].forEach(k => {
                          if (filters[k]?.includes(v)) updateFilter(k, filters[k].filter(x => x !== v))
                        })
                      }}
                      className="ml-1"
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Cards Grid */}
            {isLoading && !data ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 12 }).map((_, i) => <PlaceCardSkeleton key={i} />)}
              </div>
            ) : data?.items?.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {data.items.map((place, i) => (
                    <PlaceCard key={place.id} place={place} index={i} />
                  ))}
                </div>

                <Pagination
                  page={page}
                  totalPages={data.total_pages}
                  onPageChange={(p) => {
                    setPage(p)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />

                <p className="text-center text-xs text-gray-400 mt-3">
                  Showing {((page - 1) * 12) + 1}–{Math.min(page * 12, data.total)} of {data.total} places
                </p>
              </>
            ) : (
              <div className="text-center py-20">
                <FiMapPin size={48} className="text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-500 mb-1">No places found</h3>
                <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filters</p>
                <button onClick={resetFilters} className="btn-primary">Clear All Filters</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
