import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { FiUsers, FiMapPin, FiCalendar, FiAlertTriangle, FiDownload, FiPieChart, FiClock, FiCompass, FiShield, FiAlertCircle } from 'react-icons/fi'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { adminApi } from '../../api/index'
import api from '../../api/axios'

const NAV = [
  { to: '/admin', end: true, icon: <FiPieChart />, label: 'Dashboard' },
  { to: '/admin/approvals', icon: <FiClock />, label: 'Approvals' },
  { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
  { to: '/admin/guides', icon: <FiCompass />, label: 'Guides' },
  { to: '/admin/places', icon: <FiMapPin />, label: 'Places' },
]

const STATUS_COLORS = {
  pending: '#F59E0B', accepted: '#3B82F6',
  completed: '#10B981', rejected: '#EF4444', cancelled: '#9CA3AF'
}

function StatCard({ icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 border-brand-200 text-brand-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-2xl border p-3 sm:p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-xl sm:text-2xl">{icon}</span>
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: anomalies = [] } = useQuery({
    queryKey: ['admin-anomalies'],
    queryFn: () => adminApi.getAnomalies().then(r => r.data),
  })

  // Prepare chart data
  const bookingChartData = stats
    ? Object.entries(stats.bookings_last_7_days || {})
        .map(([date, count]) => ({ date: date.slice(5), count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : []

  const pieData = stats
    ? Object.entries(stats.booking_status_breakdown || {})
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : []

  const handleExport = (format) => {
    const url = `/api/v1/admin/export/bookings/${format}`
    window.open(url, '_blank')
  }

  return (
    <DashboardLayout navItems={NAV} icon={<FiShield className="inline" />}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Platform overview and management</p>
          </div>
          {/* <button onClick={() => window.open('/api/v1/admin/export/report/monthly', '_blank')}
            className="flex items-center gap-2 btn-primary text-sm py-2.5 px-5">
            <FiDownload size={15} /> Download Report
          </button> */}
        </div>

        {/* Stat cards */}
        {isLoading && !stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<FiUsers />} label="Total Users" value={stats?.total_users ?? 0} color="brand" />
            <StatCard icon={<FiCompass />} label="Active Guides" value={stats?.total_guides ?? 0} color="green" />
            <StatCard icon={<FiMapPin />} label="Tourist Places" value={stats?.total_places ?? 0} color="purple" />
            <StatCard icon={<FiClock />} label="Pending Approvals"
              value={stats?.pending_approvals ?? 0}
              sub={`${stats?.pending_guide_registrations ?? 0} guides · ${stats?.pending_place_requests ?? 0} places`}
              color={stats?.pending_approvals > 0 ? 'amber' : 'green'} />
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bar chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <FiCalendar size={16} className="text-brand-500" /> Bookings — Last 7 Days
            </h2>
            {bookingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bookingChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: 12 }}
                    formatter={(v) => [v, 'Bookings']}
                  />
                  <Bar dataKey="count" fill="#2E6DA4" radius={[4,4,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No bookings in last 7 days</div>
            )}
          </div>

          {/* Donut chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Booking Status</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No bookings yet</div>
            )}
          </div>
        </div>

        {/* Anomaly alerts */}
        {anomalies.length > 0 && (
          <div className="bg-white rounded-2xl border border-red-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiAlertTriangle className="text-red-500" size={16} /> Anomaly Alerts
            </h2>
            <div className="space-y-2">
              {anomalies.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-3">
                  <span className="text-red-500 mt-0.5"><FiAlertCircle /></span>
                  <div>
                    <p className="text-sm font-medium text-red-800">{a.type || 'Anomaly detected'}</p>
                    <p className="text-xs text-red-600 mt-0.5">{a.message || 'Unusual activity pattern detected for user'} {a.user_id ? `(User #${a.user_id})` : ''}</p>
                    <p className="text-xs text-red-400 mt-1">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/admin/approvals" className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:border-brand-300 hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-xl"><FiClock /></div>
            <div>
              <p className="font-semibold text-gray-800 group-hover:text-brand-600 transition-colors">Review Approvals</p>
              <p className="text-sm text-gray-500">{stats?.pending_approvals ?? '—'} pending review</p>
            </div>
          </a>
          <a href="/admin/guides" className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:border-brand-300 hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center text-xl"><FiCompass /></div>
            <div>
              <p className="font-semibold text-gray-800 group-hover:text-brand-600 transition-colors">Manage Guides</p>
              <p className="text-sm text-gray-500">{stats?.total_guides ?? '—'} active guides</p>
            </div>
          </a>
        </div>
      </div>
    </DashboardLayout>
  )
}
