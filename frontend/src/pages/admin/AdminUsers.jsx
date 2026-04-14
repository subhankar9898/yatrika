import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiPieChart, FiClock, FiUsers, FiCompass, FiMapPin, FiShield } from 'react-icons/fi'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminApi } from '../../api/index'
import { useDebounce } from '../../hooks'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/admin', end: true, icon: <FiPieChart />, label: 'Dashboard' },
  { to: '/admin/approvals', icon: <FiClock />, label: 'Approvals' },
  { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
  { to: '/admin/guides', icon: <FiCompass />, label: 'Guides' },
  { to: '/admin/places', icon: <FiMapPin />, label: 'Places' },
]

function CreateUserModal({ onClose }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'user', phone: '' })
  const queryClient = useQueryClient()
  const create = useMutation({
    mutationFn: () => adminApi.createUser(form),
    onSuccess: () => {
      toast.success('User created. Default password sent via email.')
      queryClient.invalidateQueries(['admin-users'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed'),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Create New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
        </div>
        <div className="space-y-3">
          {[['full_name','Full Name','text'],['email','Email','email'],['phone','Phone (optional)','tel']].map(([k,l,t]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
              <input type={t} className="input text-sm" value={form[k]}
                onChange={e => setForm({...form,[k]:e.target.value})} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select className="input text-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="user">User</option>
              <option value="guide">Guide</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">A default password will be auto-generated and sent to the user's email.</p>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={() => create.mutate()} disabled={create.isPending} className="flex-1 btn-primary disabled:opacity-50">
            {create.isPending ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditUserModal({ user, onClose }) {
  const [form, setForm] = useState({ 
    full_name: user?.full_name || '', 
    phone: user?.phone || '', 
    role: user?.role || 'user' 
  })
  const queryClient = useQueryClient()
  const update = useMutation({
    mutationFn: () => adminApi.updateUser(user.id, form),
    onSuccess: () => {
      toast.success('User updated successfully.')
      queryClient.invalidateQueries(['admin-users'])
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed update'),
  })
  if (!user) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Edit User: {user.email}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
        </div>
        <div className="space-y-3">
          {[['full_name','Full Name','text'],['phone','Phone (optional)','tel']].map(([k,l,t]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
              <input type={t} className="input text-sm" value={form[k]}
                onChange={e => setForm({...form,[k]:e.target.value})} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select className="input text-sm" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="user">User</option>
              <option value="guide">Guide</option>
              <option value="admin">Admin</option>
            </select>
            {form.role === 'guide' && user.role !== 'guide' && (
              <p className="text-[10px] text-amber-600 mt-1">A Guide profile will be automatically generated.</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button onClick={() => update.mutate()} disabled={update.isPending} className="flex-1 btn-primary disabled:opacity-50">
            {update.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}


export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editUserModal, setEditUserModal] = useState(null)
  const debouncedSearch = useDebounce(search, 400)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, roleFilter, page],
    queryFn: () => adminApi.getUsers({ search: debouncedSearch, role: roleFilter, page, per_page: 15 }).then(r => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => adminApi.updateUser(id, { is_active }),
    onSuccess: () => { toast.success('User updated'); queryClient.invalidateQueries(['admin-users']) },
  })

  const ROLE_BADGE = {
    admin: 'bg-purple-100 text-purple-700',
    guide: 'bg-green-100 text-green-700',
    user: 'bg-blue-100 text-blue-700',
  }

  return (
    <DashboardLayout navItems={NAV} icon={<FiShield className="inline" />}>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Users</h1>
            <p className="text-gray-500 text-sm">{data?.total ?? '–'} total users</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <FiPlus size={15} /> Add User
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input className="input pl-9 text-sm" placeholder="Search name or email..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm w-36" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="guide">Guide</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && !data ? (
                  Array.from({length: 5}).map((_, i) => (
                    <tr key={i}>
                      {[1,2,3,4,5].map(j => (
                        <td key={j} className="px-4 py-3"><div className="h-4 skeleton rounded w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.items?.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                          {u.full_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.full_name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell text-xs">
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id === useAuthStore.getState().user?.id ? (
                        <span className="text-xs text-gray-400 italic">You</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Edit User"
                            onClick={() => setEditUserModal(u)}
                            className="text-gray-400 hover:text-brand-600 transition-colors p-1"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              u.is_active
                                ? 'border-red-200 text-red-500 hover:bg-red-50'
                                : 'border-green-200 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Page {page} of {data.total_pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                <button onClick={() => setPage(p => p+1)} disabled={page === data.total_pages}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editUserModal && <EditUserModal user={editUserModal} onClose={() => setEditUserModal(null)} />}
    </DashboardLayout>
  )
}
