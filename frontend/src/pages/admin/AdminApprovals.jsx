import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiCheck, FiX, FiFilter, FiLink, FiXCircle, FiMessageCircle, FiDollarSign, FiBriefcase, FiCalendar, FiTag, FiCheckCircle, FiPieChart, FiClock, FiUsers, FiCompass, FiMapPin, FiShield } from 'react-icons/fi'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminApi } from '../../api/index'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/admin', end: true, icon: <FiPieChart />, label: 'Dashboard' },
  { to: '/admin/approvals', icon: <FiClock />, label: 'Approvals' },
  { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
  { to: '/admin/guides', icon: <FiCompass />, label: 'Guides' },
  { to: '/admin/places', icon: <FiMapPin />, label: 'Places' },
]

function ActionModal({ item, type, action, onConfirm, onClose }) {
  const [note, setNote] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1 capitalize">
          {action} {type === 'guide' ? 'Guide Registration' : type === 'assignment' ? 'Assignment Request' : 'Place Request'}
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          {type === 'guide' ? item.full_name : item.place_name}
        </p>
        {action === 'reject' && (
          <textarea
            className="input resize-none mb-4"
            rows={3}
            placeholder="Reason for rejection (will be sent via email)..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button
            onClick={() => onConfirm(note)}
            className={`flex-1 font-semibold py-2.5 rounded-lg transition-colors text-white ${
              action === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {action === 'approve' ? '<FiCheckCircle /> Confirm Approve' : '<FiXCircle /> Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GuideApprovalsTab() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [modal, setModal] = useState(null)
  const queryClient = useQueryClient()

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ['admin-pending-guides', statusFilter],
    queryFn: () => adminApi.getPendingGuides({ status: statusFilter }).then(r => r.data),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }) => adminApi.reviewGuide(id, { action, note }),
    onSuccess: (_, { action }) => {
      toast.success(`Guide ${action}d successfully`)
      queryClient.invalidateQueries(['admin-pending-guides'])
      queryClient.invalidateQueries(['admin-dashboard'])
      setModal(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Action failed'),
  })

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-sm px-4 py-2 rounded-full border capitalize transition-all ${
              statusFilter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            }`}
          >{s}</button>
        ))}
      </div>

      {isLoading && !guides ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
      ) : guides.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl mb-3 block"><FiCompass /></span>
          <p className="text-gray-500">No {statusFilter} guide registrations</p>
        </div>
      ) : guides.map(g => (
        <div key={g.guide_profile_id} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-800">{g.full_name}</h3>
                <span className={`badge text-xs border ${
                  g.approval_status === 'pending' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                  g.approval_status === 'approved' ? 'bg-green-50 border-green-200 text-green-700' :
                  'bg-red-50 border-red-200 text-red-700'
                }`}>{g.approval_status}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{g.email}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                {g.languages?.length > 0 && <span><FiMessageCircle /> {g.languages.join(', ')}</span>}
                <span><FiBriefcase /> {g.experience_years} yrs experience</span>
                <span><FiCalendar /> Applied {new Date(g.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              {g.bio && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">{g.bio}</p>}
              {g.admin_note && <p className="text-sm text-red-500 mt-2 italic">Note: {g.admin_note}</p>}
            </div>
            {g.approval_status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setModal({ item: g, action: 'approve' })}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <FiCheck size={14} /> Approve
                </button>
                <button
                  onClick={() => setModal({ item: g, action: 'reject' })}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                  <FiX size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {modal && (
        <ActionModal
          item={modal.item}
          type="guide"
          action={modal.action}
          onConfirm={(note) => reviewMutation.mutate({ id: modal.item.guide_profile_id, action: modal.action, note })}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function PlaceRequestsTab() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [modal, setModal] = useState(null)
  const queryClient = useQueryClient()

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-place-requests', statusFilter],
    queryFn: () => adminApi.getPlaceRequests({ status: statusFilter }).then(r => r.data),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }) => adminApi.reviewPlaceRequest(id, { action, note }),
    onSuccess: (_, { action }) => {
      toast.success(`Place request ${action}d`)
      queryClient.invalidateQueries(['admin-place-requests'])
      queryClient.invalidateQueries(['admin-dashboard'])
      setModal(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-sm px-4 py-2 rounded-full border capitalize transition-all ${
              statusFilter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            }`}>{s}</button>
        ))}
      </div>

      {isLoading && !requests ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl mb-3 block"><FiMapPin /></span>
          <p className="text-gray-500">No {statusFilter} place requests</p>
        </div>
      ) : requests.map(r => (
        <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">{r.place_name}</h3>
              <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                <span><FiMapPin /> {r.city}, {r.state}</span>
                <span><FiTag />️ {r.type}</span>
                {r.significance && <span>✨ {r.significance}</span>}
                {r.entrance_fee_inr === 0 ? <span><FiTag /> Free entry</span> : <span><FiDollarSign /> ₹{r.entrance_fee_inr}</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1">Requested by: <strong>{r.guide_name}</strong> ({r.guide_email})</p>
              {r.description && <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">{r.description}</p>}
              {r.admin_note && <p className="text-sm text-red-500 mt-1 italic">Note: {r.admin_note}</p>}
            </div>
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => setModal({ item: r, action: 'approve' })}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  <FiCheck size={14} /> Approve
                </button>
                <button onClick={() => setModal({ item: r, action: 'reject' })}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  <FiX size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {modal && (
        <ActionModal item={modal.item} type="place" action={modal.action}
          onConfirm={(note) => reviewMutation.mutate({ id: modal.item.id, action: modal.action, note })}
          onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function AssignmentRequestsTab() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [modal, setModal] = useState(null)
  const queryClient = useQueryClient()

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-assignment-requests', statusFilter],
    queryFn: () => adminApi.getAssignmentRequests({ status: statusFilter }).then(r => r.data),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }) => adminApi.reviewAssignmentRequest(id, { action, note }),
    onSuccess: (_, { action }) => {
      toast.success(`Assignment request ${action}d`)
      queryClient.invalidateQueries(['admin-assignment-requests'])
      setModal(null)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-sm px-4 py-2 rounded-full border capitalize transition-all ${
              statusFilter === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            }`}>{s}</button>
        ))}
      </div>

      {isLoading && !requests ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl mb-3 block"><FiLink /></span>
          <p className="text-gray-500">No {statusFilter} assignment requests</p>
        </div>
      ) : requests.map(r => (
        <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">Assign to {r.place_name}</h3>
              <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                <span><FiMapPin /> {r.city}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Requested by: <strong>{r.guide_name}</strong> ({r.guide_email})</p>
              {r.admin_note && <p className="text-sm text-red-500 mt-1 italic">Note: {r.admin_note}</p>}
            </div>
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => setModal({ item: r, action: 'approve' })}
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  <FiCheck size={14} /> Approve
                </button>
                <button onClick={() => setModal({ item: r, action: 'reject' })}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                  <FiX size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {modal && (
        <ActionModal item={{ place_name: `Assignment for ${modal.item.guide_name} to ${modal.item.place_name}` }} type="assignment" action={modal.action}
          onConfirm={(note) => reviewMutation.mutate({ id: modal.item.id, action: modal.action, note })}
          onClose={() => setModal(null)} />
      )}
    </div>
  )
}

export default function AdminApprovals() {
  const [activeTab, setActiveTab] = useState('guides')

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then(r => r.data),
  })

  return (
    <DashboardLayout navItems={NAV} icon={<FiShield className="inline" />}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Approval Queue</h1>
          <p className="text-gray-500 text-sm mt-0.5">Review and manage pending registrations and place requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('guides')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
              activeTab === 'guides' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            <FiCompass /> Guide Registrations
            {stats?.pending_guide_registrations > 0 && (
              <span className={`badge text-xs ${activeTab === 'guides' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {stats.pending_guide_registrations}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('places')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
              activeTab === 'places' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            <FiMapPin /> Place Requests
            {stats?.pending_place_requests > 0 && (
              <span className={`badge text-xs ${activeTab === 'places' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'}`}>
                {stats.pending_place_requests}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
              activeTab === 'assignments' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'
            }`}>
            <FiLink /> Assignment Requests
            {/* badge optional */}
          </button>
        </div>

        {activeTab === 'guides' ? <GuideApprovalsTab /> : activeTab === 'places' ? <PlaceRequestsTab /> : <AssignmentRequestsTab />}
      </div>
    </DashboardLayout>
  )
}
