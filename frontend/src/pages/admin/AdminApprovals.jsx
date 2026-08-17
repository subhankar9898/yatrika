import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FiCheck, FiX, FiFilter, FiLink, FiXCircle, FiMessageCircle, FiDollarSign, FiBriefcase, FiCalendar, FiTag, FiCheckCircle, FiPieChart, FiClock, FiUsers, FiCompass, FiMapPin, FiShield, FiVideo, FiExternalLink } from 'react-icons/fi'
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

const MEET_LINK_HINT =
    'Open Google Meet, start an instant meeting, copy the link from your browser, then paste it below.'

function isValidGoogleMeetLink(url) {
    try {
        const u = new URL(url.trim())
        const host = u.hostname.replace(/^www\./, '')
        if (host === 'meet.google.com') {
            const code = u.pathname.replace(/^\//, '')
            return code.length >= 8 && /^[a-z]{2,10}(-[a-z]{2,10}){1,3}$/.test(code)
        }
        if (host === 'calendar.google.com' || host === 'calendar.app.google') {
            return (u.pathname + u.search).toLowerCase().includes('meet')
        }
        if (host === 'g.co' && u.pathname.startsWith('/meet')) return true
    } catch {
        return false
    }
    return false
}

function ScheduleMeetModal({ guide, onConfirm, onClose, loading }) {
    const defaultWhen = () => {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        d.setMinutes(0)
        return d.toISOString().slice(0, 16)
    }
    const [form, setForm] = useState({
        meet_title: `Yatrika Guide Verification — ${guide.full_name}`,
        meet_scheduled_at: defaultWhen(),
        meet_link: '',
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.meet_title.trim() || !form.meet_link.trim()) {
            toast.error('Meeting title and link are required')
            return
        }
        if (!isValidGoogleMeetLink(form.meet_link)) {
            toast.error('Paste a real Google Meet link from meet.google.com/new (generated links do not work)')
            return
        }
        onConfirm({
            meet_title: form.meet_title.trim(),
            meet_scheduled_at: new Date(form.meet_scheduled_at).toISOString(),
            meet_link: form.meet_link.trim(),
        })
    }

    const openGoogleMeet = () => {
        window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')
        toast('Create a meeting, copy the link from the address bar, then paste it here', { icon: 'ℹ️', duration: 6000 })
    }

    return createPortal(
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 w-full max-w-md p-6"
            >
                <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                    <FiVideo className="text-emerald-600" /> Schedule Verification Call
                </h2>
                <p className="text-gray-500 text-sm mb-4">
                    For <strong>{guide.full_name}</strong> — details will be emailed to {guide.email}
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Meeting title</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="e.g. Yatrika Guide Verification Call"
                            value={form.meet_title}
                            onChange={e => setForm({ ...form, meet_title: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date &amp; time</label>
                        <input
                            type="datetime-local"
                            className="input"
                            value={form.meet_scheduled_at}
                            onChange={e => setForm({ ...form, meet_scheduled_at: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Meet link</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                className="input flex-1 min-w-0"
                                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                value={form.meet_link}
                                onChange={e => setForm({ ...form, meet_link: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={openGoogleMeet}
                                className="btn-secondary shrink-0 px-3 py-2.5 flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap"
                                title="Open Google Meet to create a real meeting link"
                            >
                                <FiExternalLink size={14} />
                                Open Meet
                            </button>
                        </div>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                            {MEET_LINK_HINT}
                        </p>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
                            {loading ? 'Sending...' : 'Schedule & Email Guide'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>,
        document.body
    )
}

function ActionModal({ item, type, action, onConfirm, onClose }) {
    const [note, setNote] = useState('')
    return createPortal(
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 w-full max-w-md p-6"
            >
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
                        className={`flex-1 font-semibold py-2.5 rounded-lg transition-colors text-white ${action === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                            }`}
                    >
                        {action === 'approve' ? ' Confirm Approve' : 'Confirm Reject'}
                    </button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    )
}

function GuideApprovalsTab() {
    const [statusFilter, setStatusFilter] = useState('pending')
    const [modal, setModal] = useState(null)
    const [scheduleModal, setScheduleModal] = useState(null)
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

    const scheduleMeetMutation = useMutation({
        mutationFn: ({ guideProfileId, data }) => adminApi.scheduleGuideMeet(guideProfileId, data).then((r) => r.data),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['admin-pending-guides'])
            setScheduleModal(null)
            if (data.email_sent) {
                toast.success(`Verification scheduled — email sent to ${data.guide_email}`)
            } else {
                toast.error(
                    data.email_error ||
                    `Meet saved but email was not sent to ${data.guide_email}. Check backend/.env Gmail settings.`,
                    { duration: 8000 },
                )
            }
        },
        onError: (e) => toast.error(e.response?.data?.detail || 'Failed to schedule Meet'),
    })

    const meetScheduled = (g) => g.meet_status === 'scheduled'

    return (
        <div className="space-y-4">
            {/* Status filter */}
            <div className="flex gap-2">
                {['pending', 'approved', 'rejected'].map(s => (
                    <button key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`text-sm px-4 py-2 rounded-full border capitalize transition-all ${statusFilter === s ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                            }`}
                    >{s}</button>
                ))}
            </div>

            {isLoading && !guides ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
            ) : guides.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <FiCompass size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No {statusFilter} guide registrations</p>
                </div>
            ) : guides.map(g => (
                <div key={g.guide_profile_id} className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-gray-800">{g.full_name}</h3>
                                <span className={`badge text-xs border ${g.approval_status === 'pending' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
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
                            {g.approval_status === 'pending' && (
                                <div className="mt-4 space-y-3">
                                    {!meetScheduled(g) ? (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                            <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                                                <FiCalendar size={15} />
                                                Schedule a verification call to enable approval
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setScheduleModal(g)}
                                                className="mt-3 btn-primary text-sm py-2 px-4 flex items-center gap-2"
                                            >
                                                <FiVideo size={15} />
                                                Schedule Verification Call
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-2">
                                            <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
                                                <FiCheckCircle size={15} />
                                                Verification call scheduled
                                            </p>
                                            {g.meet_title && (
                                                <p className="text-sm text-green-800"><strong>{g.meet_title}</strong></p>
                                            )}
                                            {g.meet_scheduled_at && (
                                                <p className="text-xs text-green-700 flex items-center gap-1">
                                                    <FiCalendar size={12} />
                                                    {new Date(g.meet_scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            )}
                                            {g.meet_link && (
                                                <a
                                                    href={g.meet_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                                                >
                                                    <FiVideo size={15} /> Open Google Meet
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {g.approval_status === 'pending' && (
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setModal({ item: g, action: 'approve' })}
                                    disabled={!meetScheduled(g)}
                                    title={!meetScheduled(g) ? 'Schedule verification call first' : undefined}
                                    className={`flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${!meetScheduled(g) ? 'opacity-40 cursor-not-allowed' : ''
                                        }`}
                                >
                                    <FiCheck size={14} /> Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModal({ item: g, action: 'reject' })}
                                    disabled={!meetScheduled(g)}
                                    title={!meetScheduled(g) ? 'Schedule verification call first' : undefined}
                                    className={`flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${!meetScheduled(g) ? 'opacity-40 cursor-not-allowed' : ''
                                        }`}
                                >
                                    <FiX size={14} /> Reject
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            <AnimatePresence>
            {modal && (
                <ActionModal
                    item={modal.item}
                    type="guide"
                    action={modal.action}
                    onConfirm={(note) => reviewMutation.mutate({ id: modal.item.guide_profile_id, action: modal.action, note })}
                    onClose={() => setModal(null)}
                />
            )}
            </AnimatePresence>
            <AnimatePresence>
            {scheduleModal && (
                <ScheduleMeetModal
                    guide={scheduleModal}
                    loading={scheduleMeetMutation.isPending}
                    onConfirm={(data) =>
                        scheduleMeetMutation.mutate({ guideProfileId: scheduleModal.guide_profile_id, data })
                    }
                    onClose={() => setScheduleModal(null)}
                />
            )}
            </AnimatePresence>
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
                        className={`text-sm px-4 py-2 rounded-full border capitalize transition-all ${statusFilter === s ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                            }`}>{s}</button>
                ))}
            </div>

            {isLoading && !requests ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <FiMapPin size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No {statusFilter} place requests</p>
                </div>
            ) : requests.map(r => (
                <div key={r.id} className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 group">
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

            <AnimatePresence>
            {modal && (
                <ActionModal item={modal.item} type="place" action={modal.action}
                    onConfirm={(note) => reviewMutation.mutate({ id: modal.item.id, action: modal.action, note })}
                    onClose={() => setModal(null)} />
            )}
            </AnimatePresence>
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
                        className={`text-sm px-4 py-2 rounded-full border capitalize transition-all ${statusFilter === s ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                            }`}>{s}</button>
                ))}
            </div>

            {isLoading && !requests ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <FiLink size={48} className="text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No {statusFilter} assignment requests</p>
                </div>
            ) : requests.map(r => (
                <div key={r.id} className="bg-gradient-to-br from-white to-gray-50/80 rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300 group">
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

            <AnimatePresence>
            {modal && (
                <ActionModal item={{ place_name: `Assignment for ${modal.item.guide_name} to ${modal.item.place_name}` }} type="assignment" action={modal.action}
                    onConfirm={(note) => reviewMutation.mutate({ id: modal.item.id, action: modal.action, note })}
                    onClose={() => setModal(null)} />
            )}
            </AnimatePresence>
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
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${activeTab === 'guides' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'
                            }`}>
                        <FiCompass /> Guide Registrations
                        {stats?.pending_guide_registrations > 0 && (
                            <span className={`badge text-xs ${activeTab === 'guides' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                {stats.pending_guide_registrations}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('places')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${activeTab === 'places' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'
                            }`}>
                        <FiMapPin /> Place Requests
                        {stats?.pending_place_requests > 0 && (
                            <span className={`badge text-xs ${activeTab === 'places' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                {stats.pending_place_requests}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('assignments')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border ${activeTab === 'assignments' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'
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
