import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  PageHeader, Btn, Table, Modal,
  Field, Input, Textarea, Spinner
} from '../components/UI'
import { api } from '../api'

const COLS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email', render: r => r.email || '—' },
  { key: 'address', label: 'Address', render: r => r.address || '—' },
  { key: 'created_at', label: 'Member Since', render: r => new Date(r.created_at).toLocaleDateString('en-IN') },
]

const EMPTY = { name: '', phone: '', email: '', address: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.getCustomers().then(setCustomers).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.addCustomer(form)
      setOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Customers" subtitle="Manage your customer database">
        <Btn onClick={() => setOpen(true)}><Plus size={16} /> Add Customer</Btn>
      </PageHeader>

      {loading ? <Spinner /> : (
        <Table columns={COLS} data={customers} emptyMsg="No customers yet." />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add New Customer">
        <form onSubmit={submit}>
          <Field label="Full Name *">
            <Input value={form.name} onChange={set('name')} required placeholder="Customer name" />
          </Field>
          <Field label="Phone Number *">
            <Input type="tel" value={form.phone} onChange={set('phone')} required placeholder="+91XXXXXXXXXX" />
          </Field>
          <Field label="Email Address">
            <Input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
          </Field>
          <Field label="Address">
            <Textarea value={form.address} onChange={set('address')} placeholder="Enter address" />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Customer'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
