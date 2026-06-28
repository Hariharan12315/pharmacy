import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { PageHeader, Spinner, Card } from '../components/UI'
import { api } from '../api'

const COLORS = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

export default function Reports() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTransactions().then(setTxns).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  // Aggregate: daily sales
  const dailyMap = {}
  txns.forEach(t => {
    const d = t.created_at?.slice(0, 10) || 'Unknown'
    dailyMap[d] = (dailyMap[d] || 0) + Number(t.total_amount)
  })
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, total]) => ({ date: date.slice(5), total: +total.toFixed(2) }))

  // Aggregate: by medicine
  const medMap = {}
  txns.forEach(t => {
    medMap[t.medicine_name] = (medMap[t.medicine_name] || 0) + Number(t.quantity)
  })
  const pieData = Object.entries(medMap).map(([name, value]) => ({ name, value }))

  const totalRevenue = txns.reduce((s, t) => s + Number(t.total_amount), 0)
  const avgSale = txns.length ? (totalRevenue / txns.length).toFixed(2) : 0

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales analytics and insights" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 28 }}>
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}` },
          { label: 'Total Transactions', value: txns.length },
          { label: 'Avg Sale Value', value: `₹${avgSale}` },
        ].map(s => (
          <Card key={s.label}>
            <div style={{ color: 'var(--gray-500)', fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Card>
          <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 15 }}>Daily Sales (₹)</h3>
          {dailyData.length === 0
            ? <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 32 }}>No sales data yet.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={v => `₹${v}`} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </Card>

        <Card>
          <h3 style={{ fontWeight: 700, marginBottom: 18, fontSize: 15 }}>Top Medicines by Qty Sold</h3>
          {pieData.length === 0
            ? <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 32 }}>No sales data yet.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )
          }
        </Card>
      </div>
    </div>
  )
}
