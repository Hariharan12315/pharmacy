import { useEffect, useState } from 'react'
import { Package, Users, AlertTriangle, TrendingUp } from 'lucide-react'
import { PageHeader, StatCard, Spinner, Card } from '../components/UI'
import { api } from '../api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getDashboardStats()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return (
    <div style={{ color: 'var(--red)', padding: 32, textAlign: 'center' }}>
      ⚠ Could not connect to server: {error}
      <p style={{ marginTop: 8, color: 'var(--gray-500)', fontSize: 14 }}>Make sure Flask is running on port 5000.</p>
    </div>
  )

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your pharmacy operations" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 32 }}>
        <StatCard
          icon={<Package size={22} />}
          label="Total Medicines"
          value={stats?.totalMedicines ?? '—'}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          label="Low Stock Items"
          value={stats?.lowStockItems ?? '—'}
          color="amber"
        />
        <StatCard
          icon={<Users size={22} />}
          label="Total Customers"
          value={stats?.totalCustomers ?? '—'}
          color="green"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Today's Sales (₹)"
          value={stats?.todaysSales != null ? `₹${Number(stats.todaysSales).toFixed(2)}` : '—'}
          color="indigo"
        />
      </div>

      <Card>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Quick Start</h2>
        <ul style={{ paddingLeft: 20, color: 'var(--gray-500)', fontSize: 14, lineHeight: 2 }}>
          <li>Go to <strong>Inventory</strong> to add and manage medicines</li>
          <li>Use <strong>Billing &amp; Sales</strong> to create new transactions with optional SMS alerts</li>
          <li>Check <strong>Customers</strong> to manage your customer list</li>
          <li>View <strong>Reports</strong> for sales analytics</li>
        </ul>
      </Card>
    </div>
  )
}
