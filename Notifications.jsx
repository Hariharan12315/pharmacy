import { useEffect, useState } from 'react'
import { PageHeader, Table, Badge, Spinner } from '../components/UI'
import { api } from '../api'

const COLS = [
  { key: 'type', label: 'Type', render: r => <Badge color="blue">{r.type}</Badge> },
  { key: 'customer_name', label: 'Customer' },
  { key: 'medicine_name', label: 'Medicine', render: r => r.medicine_name || '—' },
  { key: 'message', label: 'Message' },
  { key: 'status', label: 'Status', render: r =>
    <Badge color={r.status === 'sent' ? 'green' : 'amber'}>{r.status}</Badge>
  },
  { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString('en-IN') },
]

export default function Notifications() {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getNotifications().then(setNotifs).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="SMS and voice call alerts sent to customers"
      />
      {loading ? <Spinner /> : (
        <Table
          columns={COLS}
          data={notifs}
          emptyMsg="No notifications yet. Notifications are logged when you complete a sale with SMS enabled."
        />
      )}
    </div>
  )
}
