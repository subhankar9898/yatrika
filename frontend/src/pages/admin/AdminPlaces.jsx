import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiMapPin, FiStar, FiAlertTriangle, FiPieChart, FiClock, FiUsers, FiCompass, FiShield } from 'react-icons/fi'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { placesApi } from '../../api/places'
import { adminApi } from '../../api/index'
import { useDebounce } from '../../hooks'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/admin', end: true, icon: <FiPieChart />, label: 'Dashboard' },
  { to: '/admin/approvals', icon: <FiClock />, label: 'Approvals' },
  { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
  { to: '/admin/guides', icon: <FiCompass />, label: 'Guides' },
  { to: '/admin/places', icon: <FiMapPin />, label: 'Places' },
]

const EMPTY_FORM = {
  name: '', city: '', state: '', zone: '', type: '',
  significance: '', entrance_fee_inr: 0, google_rating: '',
  time_needed_hrs: '', best_time_to_visit: '', description: '', photo_url: '',
}

function PlaceFormModal({ place, onClose }) {
  const [form, setForm] = useState(place ? {
    name: place.name, city: place.city, state: place.state, zone: place.zone,
    type: place.type, significance: place.significance, entrance_fee_inr: place.entrance_fee_inr,
    description: place.description || '', photo_url: place.photo_url || '',
    google_rating: place.google_rating || '', time_needed_hrs: place.time_needed_hrs || '',
    best_time_to_visit: place.best_time_to_visit || '',
  } : EMPTY_FORM)

  const queryClient = useQueryClient()
  const isEdit = !!place

  const save = useMutation({
    mutationFn: () => isEdit
      ? placesApi.update(place.id, form)
      : placesApi.create(form),
    onSuccess: () => {
      toast.success(isEdit ? 'Place updated' : 'Place created')
      queryClient.invalidateQueries(['admin-places'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  const fields = [
    ['name','Name','text',true],['city','City','text',true],
    ['state','State','text',true],['zone','Zone','text',true],
    ['type','Type','text',true],['significance','Significance','text',false],
    ['entrance_fee_inr','Entrance Fee (₹)','number',false],
    ['google_rating','Google Rating','number',false],
    ['time_needed_hrs','Visit Duration (hrs)','number',false],
    ['best_time_to_visit','Best Time to Visit','text',false],
    ['photo_url','Photo URL (Cloudinary/Unsplash)','url',false],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Edit Place' : 'Add New Place'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(([k, l, t, req]) => (
            <div key={k} className={k === 'photo_url' || k === 'description' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l}{req && <span className="text-red-400 ml-0.5">*</span>}</label>
              <input type={k === 'photo_url' ? 'text' : t} className="input text-sm" value={form[k]}
                onChange={e => setForm({...form,[k]:t==='number'?e.target.value:e.target.value})}
                placeholder={k === 'photo_url' ? 'Paste a direct image URL (e.g. https://...)' : ''}
                required={req} />
              {k === 'photo_url' && form.photo_url && (
                <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 h-32">
                  <img
                    src={form.photo_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                  />
                  <div style={{display:'none'}} className="w-full h-full flex items-center justify-center bg-red-50 text-red-500 text-xs">
                    <FiAlertTriangle /> Image failed to load. Try a direct image URL.
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className="input resize-none text-sm" rows={3} value={form.description}
              onChange={e => setForm({...form, description: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 btn-primary disabled:opacity-50">
            {save.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Place')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPlaces() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null) // null | 'create' | place-object
  const debouncedSearch = useDebounce(search, 400)
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-places', debouncedSearch, page],
    queryFn: () => placesApi.getAll({ search: debouncedSearch, page, per_page: 12 }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => placesApi.delete(id),
    onSuccess: () => { toast.success('Place deactivated'); queryClient.invalidateQueries(['admin-places']) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <DashboardLayout navItems={NAV} icon={<FiShield className="inline" />}>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tourist Places</h1>
            <p className="text-gray-500 text-sm">{data?.total ?? '–'} places in database</p>
          </div>
          <button onClick={() => setModal('create')} className="btn-primary text-sm flex items-center gap-1.5">
            <FiPlus size={15} /> Add Place
          </button>
        </div>

        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input className="input pl-9 text-sm" placeholder="Search places..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>

        {isLoading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 skeleton rounded-xl" />)}
          </div>
        ) : (
          <div className="relative">
            {isFetching && (
              <div className="absolute top-0 right-0 z-10 flex items-center gap-1.5 text-xs text-brand-600 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-brand-100">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/></svg>
                Updating...
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.items?.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="relative h-32 bg-gray-100">
                  {p.photo_url
                    ? <img
                        src={p.photo_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display='none'; e.target.parentElement.classList.add('bg-gradient-to-br','from-brand-50','to-gray-100') }}
                      />
                    : <div className="w-full h-full flex items-center justify-center text-3xl opacity-30"><FiMapPin /></div>
                  }
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button onClick={() => setModal(p)}
                        className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow hover:bg-brand-50 transition-colors">
                        <FiEdit2 size={12} className="text-brand-600" />
                      </button>
                      <button onClick={() => { if(window.confirm(`Deactivate "${p.name}"?`)) deleteMutation.mutate(p.id) }}
                        className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors">
                        <FiTrash2 size={12} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><FiMapPin size={10}/>{p.city}</span>
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <FiStar size={10} className="fill-amber-400 text-amber-400" />
                        {p.google_rating ?? '–'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="badge bg-gray-100 text-gray-600 text-xs">{p.type}</span>
                      <span className="text-xs text-gray-500">{p.guide_count} guide{p.guide_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data?.total_pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                <span className="text-sm text-gray-500">Page {page} of {data.total_pages}</span>
                <button onClick={() => setPage(p => p+1)} disabled={page === data.total_pages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <PlaceFormModal
          place={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </DashboardLayout>
  )
}
